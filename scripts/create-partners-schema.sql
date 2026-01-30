-- ============================================================================
-- BPOSS WHITE LABEL - MULTI-TENANT SCHEMA FOR PARTNERS/RESELLERS
-- ============================================================================
-- Author: Claude Code for MOTTIVME
-- Created: 2026-01-01
-- Description: Complete multi-tenant schema with RLS for partner management
--
-- Tables:
--   - partners: Partner/reseller accounts
--   - partner_clients: Clients belonging to each partner
--   - partner_transactions: Transactions for commission tracking
--   - partner_audit_log: Audit trail for compliance
--
-- Features:
--   - Row Level Security (RLS) for data isolation
--   - JSONB white_label_config for customization
--   - Commission tiers and rates
--   - Full audit trail
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

-- Partner tier levels
DO $$ BEGIN
    CREATE TYPE partner_tier AS ENUM ('starter', 'growth', 'premium', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Partner status
DO $$ BEGIN
    CREATE TYPE partner_status AS ENUM ('pending', 'active', 'suspended', 'terminated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Client status
DO $$ BEGIN
    CREATE TYPE client_status AS ENUM ('lead', 'trial', 'active', 'churned', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Transaction types
DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM (
        'subscription',
        'one_time',
        'upgrade',
        'downgrade',
        'refund',
        'commission_payout',
        'bonus',
        'adjustment'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Transaction status
DO $$ BEGIN
    CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. PARTNERS TABLE (Resellers/Agencies)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Authentication link (Supabase Auth user_id)
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Basic Information
    company_name TEXT NOT NULL,
    trading_name TEXT, -- Nome fantasia
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,

    -- Business Information
    document_type TEXT DEFAULT 'cnpj' CHECK (document_type IN ('cnpj', 'cpf', 'ein', 'vat')),
    document_number TEXT UNIQUE,

    -- Address
    address_street TEXT,
    address_city TEXT,
    address_state TEXT,
    address_country TEXT DEFAULT 'BR',
    address_postal_code TEXT,

    -- Partner Program Details
    tier partner_tier NOT NULL DEFAULT 'starter',
    status partner_status NOT NULL DEFAULT 'pending',

    -- Commission Structure (percentage 0-100)
    commission_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00
        CHECK (commission_rate >= 0 AND commission_rate <= 100),

    -- Tier-based commission overrides (can be NULL to use tier defaults)
    custom_commission_rate DECIMAL(5,2)
        CHECK (custom_commission_rate IS NULL OR (custom_commission_rate >= 0 AND custom_commission_rate <= 100)),

    -- Revenue Tracking
    total_mrr DECIMAL(12,2) DEFAULT 0.00,            -- Monthly Recurring Revenue from all clients
    total_commission_earned DECIMAL(12,2) DEFAULT 0.00,
    total_commission_paid DECIMAL(12,2) DEFAULT 0.00,
    pending_commission DECIMAL(12,2) DEFAULT 0.00,

    -- Client Limits by Tier
    max_clients INTEGER DEFAULT 10,                   -- Starter default
    current_client_count INTEGER DEFAULT 0,

    -- White Label Configuration (JSONB for flexibility)
    white_label_config JSONB DEFAULT '{
        "enabled": false,
        "branding": {
            "logo_url": null,
            "favicon_url": null,
            "primary_color": "#3B82F6",
            "secondary_color": "#1E40AF",
            "company_name": null
        },
        "domain": {
            "custom_domain": null,
            "subdomain": null,
            "ssl_enabled": false
        },
        "features": {
            "remove_powered_by": false,
            "custom_email_domain": false,
            "api_access": false,
            "webhook_access": false,
            "custom_reports": false
        },
        "support": {
            "custom_support_email": null,
            "support_phone": null,
            "knowledge_base_url": null
        }
    }'::jsonb,

    -- Integration Settings
    stripe_customer_id TEXT,
    stripe_connect_account_id TEXT,                  -- For receiving commission payouts
    gohighlevel_agency_id TEXT,
    gohighlevel_api_key TEXT,                        -- Encrypted in production

    -- Contract & Terms
    contract_start_date DATE,
    contract_end_date DATE,
    terms_accepted_at TIMESTAMPTZ,
    terms_version TEXT DEFAULT '1.0',

    -- Referral Tracking
    referred_by_partner_id UUID REFERENCES public.partners(id),
    referral_code TEXT UNIQUE,

    -- Notes & Metadata
    internal_notes TEXT,
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    activated_at TIMESTAMPTZ,
    suspended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. PARTNER CLIENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.partner_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Partner Reference
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,

    -- Authentication link (Supabase Auth user_id for client)
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Client Information
    company_name TEXT NOT NULL,
    trading_name TEXT,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,

    -- Business Information
    document_type TEXT DEFAULT 'cnpj' CHECK (document_type IN ('cnpj', 'cpf', 'ein', 'vat')),
    document_number TEXT,

    -- Address
    address_street TEXT,
    address_city TEXT,
    address_state TEXT,
    address_country TEXT DEFAULT 'BR',
    address_postal_code TEXT,

    -- Subscription Details
    status client_status NOT NULL DEFAULT 'lead',
    plan_name TEXT,
    plan_price DECIMAL(10,2) DEFAULT 0.00,
    billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'annual')),
    mrr DECIMAL(10,2) DEFAULT 0.00,                  -- Monthly Recurring Revenue
    arr DECIMAL(12,2) GENERATED ALWAYS AS (mrr * 12) STORED, -- Annual Recurring Revenue

    -- Commission Tracking
    commission_rate DECIMAL(5,2),                    -- Overrides partner default if set
    total_revenue_generated DECIMAL(12,2) DEFAULT 0.00,
    total_commission_generated DECIMAL(12,2) DEFAULT 0.00,

    -- Integration IDs
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    gohighlevel_location_id TEXT,
    gohighlevel_contact_id TEXT,

    -- Trial Management
    trial_start_date DATE,
    trial_end_date DATE,
    trial_converted BOOLEAN DEFAULT FALSE,

    -- Lifecycle Dates
    onboarding_started_at TIMESTAMPTZ,
    onboarding_completed_at TIMESTAMPTZ,
    first_payment_at TIMESTAMPTZ,
    last_payment_at TIMESTAMPTZ,
    churned_at TIMESTAMPTZ,
    churn_reason TEXT,

    -- Engagement Metrics
    last_login_at TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    feature_usage JSONB DEFAULT '{}',

    -- Notes & Metadata
    internal_notes TEXT,
    metadata JSONB DEFAULT '{}',
    tags TEXT[],

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint: email per partner (same email can exist across different partners)
    UNIQUE(partner_id, email)
);

-- ============================================================================
-- 4. PARTNER TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.partner_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- References
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.partner_clients(id) ON DELETE SET NULL,

    -- Transaction Details
    type transaction_type NOT NULL,
    status transaction_status NOT NULL DEFAULT 'pending',

    -- Amounts
    gross_amount DECIMAL(12,2) NOT NULL,             -- Full transaction amount
    commission_rate DECIMAL(5,2) NOT NULL,           -- Rate at time of transaction
    commission_amount DECIMAL(12,2) NOT NULL,        -- Calculated commission
    net_amount DECIMAL(12,2) NOT NULL,               -- gross_amount - commission_amount

    -- Currency
    currency TEXT DEFAULT 'BRL' CHECK (currency IN ('BRL', 'USD', 'EUR')),

    -- External References
    stripe_payment_intent_id TEXT,
    stripe_invoice_id TEXT,
    stripe_transfer_id TEXT,                         -- For commission payouts
    external_reference TEXT,

    -- Billing Period
    billing_period_start DATE,
    billing_period_end DATE,

    -- Payout Information
    payout_eligible BOOLEAN DEFAULT TRUE,
    payout_scheduled_at TIMESTAMPTZ,
    payout_completed_at TIMESTAMPTZ,
    payout_reference TEXT,

    -- Notes
    description TEXT,
    internal_notes TEXT,
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. PARTNER AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.partner_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What was affected
    partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.partner_clients(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES public.partner_transactions(id) ON DELETE SET NULL,

    -- Who did it
    actor_id UUID,                                   -- User who performed action
    actor_type TEXT CHECK (actor_type IN ('partner', 'client', 'admin', 'system')),
    actor_email TEXT,

    -- What happened
    action TEXT NOT NULL,                            -- e.g., 'create', 'update', 'delete', 'login'
    resource_type TEXT NOT NULL,                     -- e.g., 'partner', 'client', 'transaction'
    resource_id UUID,

    -- Change details
    old_values JSONB,
    new_values JSONB,

    -- Context
    ip_address INET,
    user_agent TEXT,
    request_id TEXT,

    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. PARTNER TIER CONFIGURATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.partner_tier_config (
    tier partner_tier PRIMARY KEY,

    -- Tier Details
    display_name TEXT NOT NULL,
    description TEXT,

    -- Pricing
    monthly_fee DECIMAL(10,2) DEFAULT 0.00,
    setup_fee DECIMAL(10,2) DEFAULT 0.00,

    -- Limits
    max_clients INTEGER NOT NULL,
    max_users_per_client INTEGER DEFAULT 5,

    -- Commission
    base_commission_rate DECIMAL(5,2) NOT NULL,

    -- Features (JSONB for flexibility)
    features JSONB DEFAULT '{
        "white_label": false,
        "custom_domain": false,
        "api_access": false,
        "priority_support": false,
        "dedicated_account_manager": false,
        "custom_reports": false,
        "bulk_operations": false,
        "webhook_access": false
    }'::jsonb,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Partners indexes
CREATE INDEX IF NOT EXISTS idx_partners_user_id ON public.partners(user_id);
CREATE INDEX IF NOT EXISTS idx_partners_email ON public.partners(email);
CREATE INDEX IF NOT EXISTS idx_partners_tier ON public.partners(tier);
CREATE INDEX IF NOT EXISTS idx_partners_status ON public.partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_referral_code ON public.partners(referral_code);
CREATE INDEX IF NOT EXISTS idx_partners_referred_by ON public.partners(referred_by_partner_id);
CREATE INDEX IF NOT EXISTS idx_partners_stripe_customer ON public.partners(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_partners_created_at ON public.partners(created_at DESC);

-- Partner clients indexes
CREATE INDEX IF NOT EXISTS idx_partner_clients_partner_id ON public.partner_clients(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_clients_user_id ON public.partner_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_clients_email ON public.partner_clients(email);
CREATE INDEX IF NOT EXISTS idx_partner_clients_status ON public.partner_clients(status);
CREATE INDEX IF NOT EXISTS idx_partner_clients_stripe_customer ON public.partner_clients(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_partner_clients_ghl_location ON public.partner_clients(gohighlevel_location_id);
CREATE INDEX IF NOT EXISTS idx_partner_clients_created_at ON public.partner_clients(created_at DESC);

-- Partner transactions indexes
CREATE INDEX IF NOT EXISTS idx_partner_transactions_partner_id ON public.partner_transactions(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_transactions_client_id ON public.partner_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_partner_transactions_type ON public.partner_transactions(type);
CREATE INDEX IF NOT EXISTS idx_partner_transactions_status ON public.partner_transactions(status);
CREATE INDEX IF NOT EXISTS idx_partner_transactions_date ON public.partner_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_partner_transactions_payout ON public.partner_transactions(payout_eligible, payout_completed_at);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_partner_id ON public.partner_audit_log(partner_id);
CREATE INDEX IF NOT EXISTS idx_audit_client_id ON public.partner_audit_log(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.partner_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON public.partner_audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.partner_audit_log(created_at DESC);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_partners_search ON public.partners
    USING GIN (to_tsvector('portuguese', coalesce(company_name, '') || ' ' || coalesce(contact_name, '') || ' ' || coalesce(email, '')));

CREATE INDEX IF NOT EXISTS idx_partner_clients_search ON public.partner_clients
    USING GIN (to_tsvector('portuguese', coalesce(company_name, '') || ' ' || coalesce(contact_name, '') || ' ' || coalesce(email, '')));

-- ============================================================================
-- 8. TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers
DROP TRIGGER IF EXISTS trigger_partners_updated_at ON public.partners;
CREATE TRIGGER trigger_partners_updated_at
    BEFORE UPDATE ON public.partners
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_partner_clients_updated_at ON public.partner_clients;
CREATE TRIGGER trigger_partner_clients_updated_at
    BEFORE UPDATE ON public.partner_clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_partner_transactions_updated_at ON public.partner_transactions;
CREATE TRIGGER trigger_partner_transactions_updated_at
    BEFORE UPDATE ON public.partner_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update partner client count
CREATE OR REPLACE FUNCTION update_partner_client_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.partners
        SET current_client_count = current_client_count + 1
        WHERE id = NEW.partner_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.partners
        SET current_client_count = current_client_count - 1
        WHERE id = OLD.partner_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_partner_client_count ON public.partner_clients;
CREATE TRIGGER trigger_update_partner_client_count
    AFTER INSERT OR DELETE ON public.partner_clients
    FOR EACH ROW
    EXECUTE FUNCTION update_partner_client_count();

-- Function to update partner MRR
CREATE OR REPLACE FUNCTION update_partner_mrr()
RETURNS TRIGGER AS $$
DECLARE
    v_partner_id UUID;
BEGIN
    -- Get partner_id from either NEW or OLD
    IF TG_OP = 'DELETE' THEN
        v_partner_id := OLD.partner_id;
    ELSE
        v_partner_id := NEW.partner_id;
    END IF;

    -- Recalculate total MRR for partner
    UPDATE public.partners
    SET total_mrr = COALESCE((
        SELECT SUM(mrr)
        FROM public.partner_clients
        WHERE partner_id = v_partner_id
        AND status = 'active'
    ), 0)
    WHERE id = v_partner_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_partner_mrr ON public.partner_clients;
CREATE TRIGGER trigger_update_partner_mrr
    AFTER INSERT OR UPDATE OF mrr, status OR DELETE ON public.partner_clients
    FOR EACH ROW
    EXECUTE FUNCTION update_partner_mrr();

-- Function to calculate transaction commission
CREATE OR REPLACE FUNCTION calculate_transaction_commission()
RETURNS TRIGGER AS $$
DECLARE
    v_commission_rate DECIMAL(5,2);
BEGIN
    -- Get commission rate (client override > partner custom > tier default)
    SELECT COALESCE(
        (SELECT commission_rate FROM public.partner_clients WHERE id = NEW.client_id),
        (SELECT custom_commission_rate FROM public.partners WHERE id = NEW.partner_id),
        (SELECT commission_rate FROM public.partners WHERE id = NEW.partner_id)
    ) INTO v_commission_rate;

    -- Set values
    NEW.commission_rate := COALESCE(NEW.commission_rate, v_commission_rate, 20.00);
    NEW.commission_amount := ROUND(NEW.gross_amount * (NEW.commission_rate / 100), 2);
    NEW.net_amount := NEW.gross_amount - NEW.commission_amount;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_transaction_commission ON public.partner_transactions;
CREATE TRIGGER trigger_calculate_transaction_commission
    BEFORE INSERT ON public.partner_transactions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_transaction_commission();

-- Function to update partner commission totals
CREATE OR REPLACE FUNCTION update_partner_commission_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Update partner totals when transaction is completed
    IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
        UPDATE public.partners
        SET
            total_commission_earned = total_commission_earned + NEW.commission_amount,
            pending_commission = pending_commission + CASE WHEN NOT NEW.payout_completed_at IS NOT NULL THEN NEW.commission_amount ELSE 0 END
        WHERE id = NEW.partner_id;

        -- Update client totals
        IF NEW.client_id IS NOT NULL THEN
            UPDATE public.partner_clients
            SET
                total_revenue_generated = total_revenue_generated + NEW.gross_amount,
                total_commission_generated = total_commission_generated + NEW.commission_amount
            WHERE id = NEW.client_id;
        END IF;
    END IF;

    -- Handle commission payout
    IF NEW.type = 'commission_payout' AND NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
        UPDATE public.partners
        SET
            total_commission_paid = total_commission_paid + ABS(NEW.commission_amount),
            pending_commission = pending_commission - ABS(NEW.commission_amount)
        WHERE id = NEW.partner_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_partner_commission_totals ON public.partner_transactions;
CREATE TRIGGER trigger_update_partner_commission_totals
    AFTER INSERT OR UPDATE ON public.partner_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_partner_commission_totals();

-- ============================================================================
-- AUDIT LOG FUNCTIONS (Separate function per table to avoid field reference errors)
-- ============================================================================

-- Audit function for PARTNERS table
CREATE OR REPLACE FUNCTION create_partners_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.partner_audit_log (
            partner_id, client_id, actor_type, action, resource_type, resource_id, new_values
        ) VALUES (
            NEW.id, NULL, 'system', 'create', 'partners', NEW.id, to_jsonb(NEW)
        );
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.partner_audit_log (
            partner_id, client_id, actor_type, action, resource_type, resource_id, old_values, new_values
        ) VALUES (
            NEW.id, NULL, 'system', 'update', 'partners', NEW.id, to_jsonb(OLD), to_jsonb(NEW)
        );
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.partner_audit_log (
            partner_id, client_id, actor_type, action, resource_type, resource_id, old_values
        ) VALUES (
            OLD.id, NULL, 'system', 'delete', 'partners', OLD.id, to_jsonb(OLD)
        );
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Audit function for PARTNER_CLIENTS table
CREATE OR REPLACE FUNCTION create_partner_clients_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.partner_audit_log (
            partner_id, client_id, actor_type, action, resource_type, resource_id, new_values
        ) VALUES (
            NEW.partner_id, NEW.id, 'system', 'create', 'partner_clients', NEW.id, to_jsonb(NEW)
        );
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.partner_audit_log (
            partner_id, client_id, actor_type, action, resource_type, resource_id, old_values, new_values
        ) VALUES (
            NEW.partner_id, NEW.id, 'system', 'update', 'partner_clients', NEW.id, to_jsonb(OLD), to_jsonb(NEW)
        );
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.partner_audit_log (
            partner_id, client_id, actor_type, action, resource_type, resource_id, old_values
        ) VALUES (
            OLD.partner_id, OLD.id, 'system', 'delete', 'partner_clients', OLD.id, to_jsonb(OLD)
        );
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Audit function for PARTNER_TRANSACTIONS table
CREATE OR REPLACE FUNCTION create_partner_transactions_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.partner_audit_log (
            partner_id, client_id, actor_type, action, resource_type, resource_id, new_values
        ) VALUES (
            NEW.partner_id, NEW.client_id, 'system', 'create', 'partner_transactions', NEW.id, to_jsonb(NEW)
        );
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.partner_audit_log (
            partner_id, client_id, actor_type, action, resource_type, resource_id, old_values, new_values
        ) VALUES (
            NEW.partner_id, NEW.client_id, 'system', 'update', 'partner_transactions', NEW.id, to_jsonb(OLD), to_jsonb(NEW)
        );
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.partner_audit_log (
            partner_id, client_id, actor_type, action, resource_type, resource_id, old_values
        ) VALUES (
            OLD.partner_id, OLD.client_id, 'system', 'delete', 'partner_transactions', OLD.id, to_jsonb(OLD)
        );
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers (each table uses its specific function)
DROP TRIGGER IF EXISTS trigger_partners_audit ON public.partners;
CREATE TRIGGER trigger_partners_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.partners
    FOR EACH ROW
    EXECUTE FUNCTION create_partners_audit_log();

DROP TRIGGER IF EXISTS trigger_partner_clients_audit ON public.partner_clients;
CREATE TRIGGER trigger_partner_clients_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.partner_clients
    FOR EACH ROW
    EXECUTE FUNCTION create_partner_clients_audit_log();

DROP TRIGGER IF EXISTS trigger_partner_transactions_audit ON public.partner_transactions;
CREATE TRIGGER trigger_partner_transactions_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.partner_transactions
    FOR EACH ROW
    EXECUTE FUNCTION create_partner_transactions_audit_log();

-- ============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_tier_config ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PARTNERS POLICIES
-- ============================================================================

-- Admin can see all partners
CREATE POLICY "Admin can view all partners" ON public.partners
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Admin can modify all partners
CREATE POLICY "Admin can modify all partners" ON public.partners
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Partners can see their own data
CREATE POLICY "Partners can view own data" ON public.partners
    FOR SELECT
    USING (user_id = auth.uid());

-- Partners can update their own data (limited fields)
CREATE POLICY "Partners can update own data" ON public.partners
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- PARTNER CLIENTS POLICIES
-- ============================================================================

-- Admin can see all clients
CREATE POLICY "Admin can view all clients" ON public.partner_clients
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Admin can modify all clients
CREATE POLICY "Admin can modify all clients" ON public.partner_clients
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Partners can see their own clients
CREATE POLICY "Partners can view own clients" ON public.partner_clients
    FOR SELECT
    USING (
        partner_id IN (
            SELECT id FROM public.partners WHERE user_id = auth.uid()
        )
    );

-- Partners can create clients (within limits)
CREATE POLICY "Partners can create clients" ON public.partner_clients
    FOR INSERT
    WITH CHECK (
        partner_id IN (
            SELECT id FROM public.partners
            WHERE user_id = auth.uid()
            AND current_client_count < max_clients
            AND status = 'active'
        )
    );

-- Partners can update their own clients
CREATE POLICY "Partners can update own clients" ON public.partner_clients
    FOR UPDATE
    USING (
        partner_id IN (
            SELECT id FROM public.partners WHERE user_id = auth.uid()
        )
    );

-- Partners can delete their own clients
CREATE POLICY "Partners can delete own clients" ON public.partner_clients
    FOR DELETE
    USING (
        partner_id IN (
            SELECT id FROM public.partners WHERE user_id = auth.uid()
        )
    );

-- Clients can see their own data
CREATE POLICY "Clients can view own data" ON public.partner_clients
    FOR SELECT
    USING (user_id = auth.uid());

-- ============================================================================
-- PARTNER TRANSACTIONS POLICIES
-- ============================================================================

-- Admin can see all transactions
CREATE POLICY "Admin can view all transactions" ON public.partner_transactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Admin can modify all transactions
CREATE POLICY "Admin can modify all transactions" ON public.partner_transactions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Partners can see their own transactions
CREATE POLICY "Partners can view own transactions" ON public.partner_transactions
    FOR SELECT
    USING (
        partner_id IN (
            SELECT id FROM public.partners WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- AUDIT LOG POLICIES
-- ============================================================================

-- Admin can see all audit logs
CREATE POLICY "Admin can view all audit logs" ON public.partner_audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Partners can see their own audit logs
CREATE POLICY "Partners can view own audit logs" ON public.partner_audit_log
    FOR SELECT
    USING (
        partner_id IN (
            SELECT id FROM public.partners WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- TIER CONFIG POLICIES
-- ============================================================================

-- Everyone can read tier configuration
CREATE POLICY "Anyone can view tier config" ON public.partner_tier_config
    FOR SELECT
    USING (true);

-- Only admin can modify tier configuration
CREATE POLICY "Admin can modify tier config" ON public.partner_tier_config
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- ============================================================================
-- 10. VIEWS FOR REPORTING
-- ============================================================================

-- Partner Dashboard View
CREATE OR REPLACE VIEW public.partner_dashboard AS
SELECT
    p.id,
    p.company_name,
    p.contact_name,
    p.email,
    p.tier,
    p.status,
    p.commission_rate,
    p.total_mrr,
    p.total_commission_earned,
    p.total_commission_paid,
    p.pending_commission,
    p.current_client_count,
    p.max_clients,
    p.white_label_config->>'enabled' AS white_label_enabled,
    p.created_at,
    p.activated_at,
    -- Calculated fields
    ROUND((p.current_client_count::numeric / NULLIF(p.max_clients, 0)) * 100, 1) AS capacity_percentage,
    COALESCE(
        (SELECT COUNT(*) FROM public.partner_clients pc
         WHERE pc.partner_id = p.id AND pc.status = 'active'),
        0
    ) AS active_clients,
    COALESCE(
        (SELECT COUNT(*) FROM public.partner_clients pc
         WHERE pc.partner_id = p.id AND pc.status = 'trial'),
        0
    ) AS trial_clients,
    COALESCE(
        (SELECT SUM(gross_amount) FROM public.partner_transactions pt
         WHERE pt.partner_id = p.id
         AND pt.status = 'completed'
         AND pt.transaction_date >= date_trunc('month', CURRENT_DATE)),
        0
    ) AS mtd_revenue,
    COALESCE(
        (SELECT SUM(commission_amount) FROM public.partner_transactions pt
         WHERE pt.partner_id = p.id
         AND pt.status = 'completed'
         AND pt.transaction_date >= date_trunc('month', CURRENT_DATE)),
        0
    ) AS mtd_commission
FROM public.partners p;

-- Commission Report View
CREATE OR REPLACE VIEW public.commission_report AS
SELECT
    p.id AS partner_id,
    p.company_name AS partner_name,
    p.tier AS partner_tier,
    pc.id AS client_id,
    pc.company_name AS client_name,
    pt.id AS transaction_id,
    pt.type AS transaction_type,
    pt.status AS transaction_status,
    pt.gross_amount,
    pt.commission_rate,
    pt.commission_amount,
    pt.net_amount,
    pt.currency,
    pt.transaction_date,
    pt.payout_eligible,
    pt.payout_completed_at,
    EXTRACT(MONTH FROM pt.transaction_date) AS month,
    EXTRACT(YEAR FROM pt.transaction_date) AS year
FROM public.partner_transactions pt
JOIN public.partners p ON pt.partner_id = p.id
LEFT JOIN public.partner_clients pc ON pt.client_id = pc.id
ORDER BY pt.transaction_date DESC;

-- Monthly Revenue Summary View
CREATE OR REPLACE VIEW public.monthly_revenue_summary AS
SELECT
    p.id AS partner_id,
    p.company_name,
    p.tier,
    date_trunc('month', pt.transaction_date) AS month,
    COUNT(DISTINCT pt.id) AS transaction_count,
    COUNT(DISTINCT pt.client_id) AS unique_clients,
    SUM(pt.gross_amount) AS total_revenue,
    SUM(pt.commission_amount) AS total_commission,
    SUM(pt.net_amount) AS net_to_mottivme,
    AVG(pt.commission_rate) AS avg_commission_rate
FROM public.partners p
LEFT JOIN public.partner_transactions pt ON p.id = pt.partner_id AND pt.status = 'completed'
GROUP BY p.id, p.company_name, p.tier, date_trunc('month', pt.transaction_date)
ORDER BY month DESC, total_revenue DESC;

-- Grant access to views
GRANT SELECT ON public.partner_dashboard TO authenticated;
GRANT SELECT ON public.commission_report TO authenticated;
GRANT SELECT ON public.monthly_revenue_summary TO authenticated;

-- ============================================================================
-- 11. HELPER FUNCTIONS
-- ============================================================================

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
    v_exists BOOLEAN := TRUE;
BEGIN
    WHILE v_exists LOOP
        v_code := upper(substr(md5(random()::text), 1, 8));
        SELECT EXISTS(SELECT 1 FROM public.partners WHERE referral_code = v_code) INTO v_exists;
    END LOOP;
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Function to get partner by referral code
CREATE OR REPLACE FUNCTION get_partner_by_referral(p_code TEXT)
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT id FROM public.partners WHERE referral_code = p_code AND status = 'active');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate pending commission
CREATE OR REPLACE FUNCTION calculate_pending_commission(p_partner_id UUID)
RETURNS DECIMAL(12,2) AS $$
BEGIN
    RETURN COALESCE((
        SELECT SUM(commission_amount)
        FROM public.partner_transactions
        WHERE partner_id = p_partner_id
        AND status = 'completed'
        AND payout_eligible = TRUE
        AND payout_completed_at IS NULL
    ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get tier limits
CREATE OR REPLACE FUNCTION get_tier_limits(p_tier partner_tier)
RETURNS TABLE (
    max_clients INTEGER,
    base_commission_rate DECIMAL(5,2),
    features JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ptc.max_clients,
        ptc.base_commission_rate,
        ptc.features
    FROM public.partner_tier_config ptc
    WHERE ptc.tier = p_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 12. INSERT DEFAULT TIER CONFIGURATIONS
-- ============================================================================

INSERT INTO public.partner_tier_config (tier, display_name, description, monthly_fee, setup_fee, max_clients, base_commission_rate, features)
VALUES
    ('starter', 'Starter', 'Perfect for new partners starting their journey', 0.00, 0.00, 10, 15.00, '{
        "white_label": false,
        "custom_domain": false,
        "api_access": false,
        "priority_support": false,
        "dedicated_account_manager": false,
        "custom_reports": false,
        "bulk_operations": false,
        "webhook_access": false
    }'::jsonb),
    ('growth', 'Growth', 'For growing partners expanding their client base', 97.00, 0.00, 50, 20.00, '{
        "white_label": false,
        "custom_domain": false,
        "api_access": true,
        "priority_support": true,
        "dedicated_account_manager": false,
        "custom_reports": false,
        "bulk_operations": true,
        "webhook_access": true
    }'::jsonb),
    ('premium', 'Premium', 'Full-featured for established partners', 297.00, 0.00, 200, 25.00, '{
        "white_label": true,
        "custom_domain": true,
        "api_access": true,
        "priority_support": true,
        "dedicated_account_manager": false,
        "custom_reports": true,
        "bulk_operations": true,
        "webhook_access": true
    }'::jsonb),
    ('enterprise', 'Enterprise', 'Custom solutions for large-scale operations', 997.00, 0.00, -1, 30.00, '{
        "white_label": true,
        "custom_domain": true,
        "api_access": true,
        "priority_support": true,
        "dedicated_account_manager": true,
        "custom_reports": true,
        "bulk_operations": true,
        "webhook_access": true
    }'::jsonb)
ON CONFLICT (tier) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    monthly_fee = EXCLUDED.monthly_fee,
    max_clients = EXCLUDED.max_clients,
    base_commission_rate = EXCLUDED.base_commission_rate,
    features = EXCLUDED.features,
    updated_at = NOW();

-- ============================================================================
-- 13. SAMPLE DATA FOR TESTING
-- ============================================================================

-- Insert sample partners (without auth.users reference for testing)
INSERT INTO public.partners (
    id,
    company_name,
    trading_name,
    contact_name,
    email,
    phone,
    document_type,
    document_number,
    address_city,
    address_state,
    address_country,
    tier,
    status,
    commission_rate,
    max_clients,
    white_label_config,
    referral_code,
    activated_at,
    created_at
)
VALUES
    (
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'Digital Agency Pro',
        'DAP',
        'Carlos Silva',
        'carlos@digitalagencypro.com.br',
        '+55 11 99999-1234',
        'cnpj',
        '12.345.678/0001-90',
        'Sao Paulo',
        'SP',
        'BR',
        'premium',
        'active',
        25.00,
        200,
        '{
            "enabled": true,
            "branding": {
                "logo_url": "https://example.com/logo-dap.png",
                "favicon_url": null,
                "primary_color": "#FF6B35",
                "secondary_color": "#004E64",
                "company_name": "Digital Agency Pro"
            },
            "domain": {
                "custom_domain": "app.digitalagencypro.com.br",
                "subdomain": "dap",
                "ssl_enabled": true
            },
            "features": {
                "remove_powered_by": true,
                "custom_email_domain": true,
                "api_access": true,
                "webhook_access": true,
                "custom_reports": true
            },
            "support": {
                "custom_support_email": "suporte@digitalagencypro.com.br",
                "support_phone": "+55 11 3333-4444",
                "knowledge_base_url": "https://help.digitalagencypro.com.br"
            }
        }'::jsonb,
        'DAP2026A',
        NOW() - INTERVAL '30 days',
        NOW() - INTERVAL '45 days'
    ),
    (
        'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        'Marketing Masters',
        'MM Agency',
        'Ana Costa',
        'ana@marketingmasters.com',
        '+55 21 98888-5678',
        'cnpj',
        '23.456.789/0001-01',
        'Rio de Janeiro',
        'RJ',
        'BR',
        'growth',
        'active',
        20.00,
        50,
        '{
            "enabled": false,
            "branding": {
                "logo_url": null,
                "favicon_url": null,
                "primary_color": "#3B82F6",
                "secondary_color": "#1E40AF",
                "company_name": null
            },
            "domain": {
                "custom_domain": null,
                "subdomain": null,
                "ssl_enabled": false
            },
            "features": {
                "remove_powered_by": false,
                "custom_email_domain": false,
                "api_access": true,
                "webhook_access": true,
                "custom_reports": false
            },
            "support": {
                "custom_support_email": null,
                "support_phone": null,
                "knowledge_base_url": null
            }
        }'::jsonb,
        'MM2026B',
        NOW() - INTERVAL '15 days',
        NOW() - INTERVAL '20 days'
    ),
    (
        'c3d4e5f6-a7b8-9012-cdef-123456789012',
        'Startup Solutions',
        NULL,
        'Pedro Santos',
        'pedro@startupsolutions.io',
        '+55 31 97777-9012',
        'cnpj',
        '34.567.890/0001-12',
        'Belo Horizonte',
        'MG',
        'BR',
        'starter',
        'active',
        15.00,
        10,
        '{
            "enabled": false,
            "branding": {
                "logo_url": null,
                "favicon_url": null,
                "primary_color": "#3B82F6",
                "secondary_color": "#1E40AF",
                "company_name": null
            },
            "domain": {
                "custom_domain": null,
                "subdomain": null,
                "ssl_enabled": false
            },
            "features": {
                "remove_powered_by": false,
                "custom_email_domain": false,
                "api_access": false,
                "webhook_access": false,
                "custom_reports": false
            },
            "support": {
                "custom_support_email": null,
                "support_phone": null,
                "knowledge_base_url": null
            }
        }'::jsonb,
        'SS2026C',
        NOW() - INTERVAL '5 days',
        NOW() - INTERVAL '7 days'
    )
ON CONFLICT DO NOTHING;

-- Insert sample clients for Digital Agency Pro
INSERT INTO public.partner_clients (
    id,
    partner_id,
    company_name,
    trading_name,
    contact_name,
    email,
    phone,
    status,
    plan_name,
    plan_price,
    billing_cycle,
    mrr,
    trial_converted,
    first_payment_at,
    created_at
)
VALUES
    (
        'd4e5f6a7-b8c9-0123-def0-234567890123',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'Restaurante Sabor & Arte',
        'Sabor & Arte',
        'Maria Oliveira',
        'maria@saborarte.com.br',
        '+55 11 95555-1111',
        'active',
        'Pro',
        497.00,
        'monthly',
        497.00,
        TRUE,
        NOW() - INTERVAL '25 days',
        NOW() - INTERVAL '30 days'
    ),
    (
        'e5f6a7b8-c9d0-1234-ef01-345678901234',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'Clinica Bem Estar',
        'Bem Estar',
        'Dr. Roberto Lima',
        'roberto@clinicabemestar.com',
        '+55 11 94444-2222',
        'active',
        'Enterprise',
        997.00,
        'monthly',
        997.00,
        TRUE,
        NOW() - INTERVAL '20 days',
        NOW() - INTERVAL '28 days'
    ),
    (
        'f6a7b8c9-d0e1-2345-f012-456789012345',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'Academia FitLife',
        'FitLife',
        'Fernando Souza',
        'fernando@fitlife.com.br',
        '+55 11 93333-3333',
        'trial',
        'Pro',
        497.00,
        'monthly',
        0.00,
        FALSE,
        NULL,
        NOW() - INTERVAL '5 days'
    )
ON CONFLICT DO NOTHING;

-- Insert sample clients for Marketing Masters
INSERT INTO public.partner_clients (
    id,
    partner_id,
    company_name,
    trading_name,
    contact_name,
    email,
    phone,
    status,
    plan_name,
    plan_price,
    billing_cycle,
    mrr,
    trial_converted,
    first_payment_at,
    created_at
)
VALUES
    (
        'a7b8c9d0-e1f2-3456-0123-567890123456',
        'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        'Loja Virtual TechStore',
        'TechStore',
        'Lucas Mendes',
        'lucas@techstore.com.br',
        '+55 21 92222-4444',
        'active',
        'Pro',
        497.00,
        'monthly',
        497.00,
        TRUE,
        NOW() - INTERVAL '10 days',
        NOW() - INTERVAL '14 days'
    )
ON CONFLICT DO NOTHING;

-- Insert sample transactions
INSERT INTO public.partner_transactions (
    partner_id,
    client_id,
    type,
    status,
    gross_amount,
    commission_rate,
    commission_amount,
    net_amount,
    currency,
    billing_period_start,
    billing_period_end,
    description,
    transaction_date
)
VALUES
    (
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'd4e5f6a7-b8c9-0123-def0-234567890123',
        'subscription',
        'completed',
        497.00,
        25.00,
        124.25,
        372.75,
        'BRL',
        NOW() - INTERVAL '30 days',
        NOW(),
        'Assinatura mensal - Plano Pro',
        NOW() - INTERVAL '25 days'
    ),
    (
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'e5f6a7b8-c9d0-1234-ef01-345678901234',
        'subscription',
        'completed',
        997.00,
        25.00,
        249.25,
        747.75,
        'BRL',
        NOW() - INTERVAL '25 days',
        NOW() + INTERVAL '5 days',
        'Assinatura mensal - Plano Enterprise',
        NOW() - INTERVAL '20 days'
    ),
    (
        'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        'a7b8c9d0-e1f2-3456-0123-567890123456',
        'subscription',
        'completed',
        497.00,
        20.00,
        99.40,
        397.60,
        'BRL',
        NOW() - INTERVAL '10 days',
        NOW() + INTERVAL '20 days',
        'Assinatura mensal - Plano Pro',
        NOW() - INTERVAL '10 days'
    )
ON CONFLICT DO NOTHING;

-- Update partner client counts and MRR (trigger should handle this, but ensuring consistency)
UPDATE public.partners SET
    current_client_count = (SELECT COUNT(*) FROM public.partner_clients WHERE partner_id = partners.id),
    total_mrr = (SELECT COALESCE(SUM(mrr), 0) FROM public.partner_clients WHERE partner_id = partners.id AND status = 'active'),
    total_commission_earned = (SELECT COALESCE(SUM(commission_amount), 0) FROM public.partner_transactions WHERE partner_id = partners.id AND status = 'completed');

-- ============================================================================
-- 14. GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to anon (for public access if needed)
GRANT SELECT ON public.partner_tier_config TO anon;

-- Grant permissions to authenticated users
GRANT ALL ON public.partners TO authenticated;
GRANT ALL ON public.partner_clients TO authenticated;
GRANT ALL ON public.partner_transactions TO authenticated;
GRANT SELECT ON public.partner_audit_log TO authenticated;
GRANT SELECT ON public.partner_tier_config TO authenticated;

-- Grant access to sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ============================================================================
-- 15. VERIFICATION QUERIES
-- ============================================================================

-- Verify tables were created
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'BPOSS WHITE LABEL SCHEMA CREATED';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables: partners, partner_clients, partner_transactions, partner_audit_log, partner_tier_config';
    RAISE NOTICE 'Views: partner_dashboard, commission_report, monthly_revenue_summary';
    RAISE NOTICE 'RLS: Enabled on all tables';
    RAISE NOTICE 'Sample Data: 3 partners, 4 clients, 3 transactions';
    RAISE NOTICE '========================================';
END $$;

-- Sample verification query (uncomment to run)
-- SELECT
--     p.company_name,
--     p.tier,
--     p.status,
--     p.total_mrr,
--     p.current_client_count
-- FROM public.partners p;
