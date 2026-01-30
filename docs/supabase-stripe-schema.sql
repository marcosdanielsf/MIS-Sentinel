-- =====================================================
-- STRIPE CONNECT SCHEMA - BPOSS WHITE LABEL
-- =====================================================
-- Versão: 1.1.0
-- Data: 2026-01-01
-- Descrição: Schema completo para integração Stripe Connect
--            com split de pagamentos para parceiros
-- IMPORTANTE: Execute APÓS create-partners-schema.sql
-- =====================================================

-- =====================================================
-- 1. EXTENSÕES
-- =====================================================

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 2. TIPOS ENUM (com tratamento de duplicados)
-- =====================================================

-- Partner tier (do schema multi-tenant, recriado aqui se não existir)
DO $$ BEGIN
  CREATE TYPE partner_tier AS ENUM (
    'starter',
    'growth',
    'premium',
    'enterprise'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Stripe account status (novo tipo específico para Stripe)
DO $$ BEGIN
  CREATE TYPE stripe_account_status AS ENUM (
    'pending',
    'active',
    'restricted',
    'rejected',
    'inactive'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Stripe transaction types (renomeado para evitar conflito)
DO $$ BEGIN
  CREATE TYPE stripe_transaction_type AS ENUM (
    'payment',
    'commission',
    'payout',
    'refund',
    'adjustment'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Stripe transaction status (renomeado para evitar conflito)
DO $$ BEGIN
  CREATE TYPE stripe_transaction_status AS ENUM (
    'pending',
    'processing',
    'succeeded',
    'failed',
    'canceled',
    'refunded'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Payout status
DO $$ BEGIN
  CREATE TYPE payout_status AS ENUM (
    'pending',
    'paid',
    'failed',
    'canceled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Payout method
DO $$ BEGIN
  CREATE TYPE payout_method AS ENUM (
    'standard',
    'instant'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 3. TABELAS PRINCIPAIS
-- =====================================================

-- -----------------------------------------------------
-- Tabela: partner_stripe_accounts
-- Descrição: Contas Stripe Connect dos parceiros
-- NOTA: Referencia public.partners(id) do schema multi-tenant
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS partner_stripe_accounts (
  -- Identificadores
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL UNIQUE,

  -- Status e Tier
  stripe_account_status stripe_account_status NOT NULL DEFAULT 'pending',
  tier partner_tier NOT NULL DEFAULT 'starter',
  commission_rate DECIMAL(4,3) NOT NULL DEFAULT 0.15,

  -- Flags de Status
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  details_submitted BOOLEAN NOT NULL DEFAULT false,
  charges_enabled BOOLEAN NOT NULL DEFAULT false,
  payouts_enabled BOOLEAN NOT NULL DEFAULT false,

  -- Localização e Moeda
  country TEXT NOT NULL DEFAULT 'BR',
  currency TEXT NOT NULL DEFAULT 'brl',

  -- Informações do Negócio
  business_type TEXT,
  business_name TEXT,
  email TEXT,
  phone TEXT,

  -- Saldos (em centavos)
  total_earnings BIGINT NOT NULL DEFAULT 0,
  pending_balance BIGINT NOT NULL DEFAULT 0,
  available_balance BIGINT NOT NULL DEFAULT 0,

  -- Timestamps
  last_payout_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Metadados
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Constraints
  CONSTRAINT commission_rate_range CHECK (commission_rate >= 0 AND commission_rate <= 1),
  CONSTRAINT balances_non_negative CHECK (
    total_earnings >= 0 AND
    pending_balance >= 0 AND
    available_balance >= 0
  )
);

-- Índices para partner_stripe_accounts
CREATE INDEX idx_partner_stripe_partner_id ON partner_stripe_accounts(partner_id);
CREATE INDEX idx_partner_stripe_account_id ON partner_stripe_accounts(stripe_account_id);
CREATE INDEX idx_partner_stripe_status ON partner_stripe_accounts(stripe_account_status);
CREATE INDEX idx_partner_stripe_tier ON partner_stripe_accounts(tier);
CREATE INDEX idx_partner_stripe_created_at ON partner_stripe_accounts(created_at DESC);

-- Comentários
COMMENT ON TABLE partner_stripe_accounts IS 'Contas Stripe Connect dos parceiros com informações de tier e comissões';
COMMENT ON COLUMN partner_stripe_accounts.commission_rate IS 'Taxa de comissão decimal (0.15 = 15%)';
COMMENT ON COLUMN partner_stripe_accounts.total_earnings IS 'Total de comissões ganhas em centavos';
COMMENT ON COLUMN partner_stripe_accounts.pending_balance IS 'Saldo pendente de payout em centavos';
COMMENT ON COLUMN partner_stripe_accounts.available_balance IS 'Saldo disponível para payout em centavos';

-- -----------------------------------------------------
-- Tabela: stripe_transactions
-- Descrição: Todas as transações financeiras
-- NOTA: Referencia public.partners(id) do schema multi-tenant
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS stripe_transactions (
  -- Identificadores
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL,

  -- Tipo e Status
  transaction_type stripe_transaction_type NOT NULL,
  status stripe_transaction_status NOT NULL,

  -- Valores (em centavos)
  amount BIGINT NOT NULL,
  currency TEXT NOT NULL,
  commission_amount BIGINT NOT NULL DEFAULT 0,
  commission_rate DECIMAL(4,3) NOT NULL DEFAULT 0,
  net_amount BIGINT NOT NULL DEFAULT 0,

  -- Stripe IDs
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  stripe_payout_id TEXT,
  stripe_charge_id TEXT,
  stripe_refund_id TEXT,

  -- Cliente
  customer_id TEXT,
  customer_email TEXT,

  -- Descrição e Metadados
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Erro
  failed_reason TEXT,

  -- Constraints
  CONSTRAINT commission_rate_range CHECK (commission_rate >= 0 AND commission_rate <= 1)
);

-- Índices para stripe_transactions
CREATE INDEX idx_stripe_tx_partner_id ON stripe_transactions(partner_id);
CREATE INDEX idx_stripe_tx_account_id ON stripe_transactions(stripe_account_id);
CREATE INDEX idx_stripe_tx_type ON stripe_transactions(transaction_type);
CREATE INDEX idx_stripe_tx_status ON stripe_transactions(status);
CREATE INDEX idx_stripe_tx_payment_intent ON stripe_transactions(stripe_payment_intent_id);
CREATE INDEX idx_stripe_tx_transfer ON stripe_transactions(stripe_transfer_id);
CREATE INDEX idx_stripe_tx_payout ON stripe_transactions(stripe_payout_id);
CREATE INDEX idx_stripe_tx_created_at ON stripe_transactions(created_at DESC);
CREATE INDEX idx_stripe_tx_completed_at ON stripe_transactions(completed_at DESC);

-- Comentários
COMMENT ON TABLE stripe_transactions IS 'Registro de todas as transações financeiras com parceiros';
COMMENT ON COLUMN stripe_transactions.amount IS 'Valor total da transação em centavos';
COMMENT ON COLUMN stripe_transactions.commission_amount IS 'Valor da comissão do parceiro em centavos';
COMMENT ON COLUMN stripe_transactions.net_amount IS 'Valor líquido para MOTTIVME em centavos';

-- -----------------------------------------------------
-- Tabela: partner_payouts
-- Descrição: Payouts para contas bancárias dos parceiros
-- NOTA: Referencia public.partners(id) do schema multi-tenant
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS partner_payouts (
  -- Identificadores
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL,
  stripe_payout_id TEXT NOT NULL UNIQUE,

  -- Valores
  amount BIGINT NOT NULL,
  currency TEXT NOT NULL,

  -- Status e Método
  status payout_status NOT NULL DEFAULT 'pending',
  method payout_method NOT NULL DEFAULT 'standard',

  -- Datas
  arrival_date TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,

  -- Descrição
  description TEXT,

  -- Falha
  failure_code TEXT,
  failure_message TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT payout_amount_positive CHECK (amount > 0)
);

-- Índices para partner_payouts
CREATE INDEX idx_payouts_partner_id ON partner_payouts(partner_id);
CREATE INDEX idx_payouts_account_id ON partner_payouts(stripe_account_id);
CREATE INDEX idx_payouts_stripe_id ON partner_payouts(stripe_payout_id);
CREATE INDEX idx_payouts_status ON partner_payouts(status);
CREATE INDEX idx_payouts_created_at ON partner_payouts(created_at DESC);
CREATE INDEX idx_payouts_arrival_date ON partner_payouts(arrival_date);

-- Comentários
COMMENT ON TABLE partner_payouts IS 'Registro de payouts enviados para contas bancárias dos parceiros';
COMMENT ON COLUMN partner_payouts.amount IS 'Valor do payout em centavos';
COMMENT ON COLUMN partner_payouts.arrival_date IS 'Data estimada de chegada na conta bancária';

-- =====================================================
-- 4. TRIGGERS
-- =====================================================

-- -----------------------------------------------------
-- Trigger: updated_at auto-update
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER update_partner_stripe_accounts_updated_at
  BEFORE UPDATE ON partner_stripe_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_transactions_updated_at
  BEFORE UPDATE ON stripe_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_payouts_updated_at
  BEFORE UPDATE ON partner_payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. FUNÇÕES AUXILIARES
-- =====================================================

-- -----------------------------------------------------
-- Função: update_partner_balance
-- Descrição: Atualiza saldos do parceiro atomicamente
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION update_partner_balance(
  p_partner_id UUID,
  p_commission_amount BIGINT
) RETURNS VOID AS $$
BEGIN
  UPDATE partner_stripe_accounts
  SET
    total_earnings = total_earnings + p_commission_amount,
    pending_balance = pending_balance + p_commission_amount,
    updated_at = NOW()
  WHERE partner_id = p_partner_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partner account not found: %', p_partner_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_partner_balance IS 'Atualiza saldos do parceiro atomicamente após transação';

-- -----------------------------------------------------
-- Função: move_to_available_balance
-- Descrição: Move saldo de pending para available
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION move_to_available_balance(
  p_partner_id UUID,
  p_amount BIGINT
) RETURNS VOID AS $$
BEGIN
  UPDATE partner_stripe_accounts
  SET
    pending_balance = pending_balance - p_amount,
    available_balance = available_balance + p_amount,
    updated_at = NOW()
  WHERE partner_id = p_partner_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partner account not found: %', p_partner_id;
  END IF;

  -- Validate balances
  IF (SELECT pending_balance FROM partner_stripe_accounts WHERE partner_id = p_partner_id) < 0 THEN
    RAISE EXCEPTION 'Insufficient pending balance for partner: %', p_partner_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION move_to_available_balance IS 'Move saldo de pending para available após confirmação';

-- -----------------------------------------------------
-- Função: deduct_payout
-- Descrição: Deduz valor de payout do saldo disponível
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION deduct_payout(
  p_partner_id UUID,
  p_amount BIGINT
) RETURNS VOID AS $$
BEGIN
  UPDATE partner_stripe_accounts
  SET
    available_balance = available_balance - p_amount,
    updated_at = NOW()
  WHERE partner_id = p_partner_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partner account not found: %', p_partner_id;
  END IF;

  -- Validate balance
  IF (SELECT available_balance FROM partner_stripe_accounts WHERE partner_id = p_partner_id) < 0 THEN
    RAISE EXCEPTION 'Insufficient available balance for partner: %', p_partner_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION deduct_payout IS 'Deduz valor de payout do saldo disponível do parceiro';

-- -----------------------------------------------------
-- Função: get_partner_stats
-- Descrição: Retorna estatísticas do parceiro
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION get_partner_stats(
  p_partner_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS TABLE (
  total_transactions BIGINT,
  total_revenue BIGINT,
  total_commission BIGINT,
  avg_transaction_value NUMERIC,
  successful_payments BIGINT,
  failed_payments BIGINT,
  refunds_count BIGINT,
  refunds_amount BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_transactions,
    COALESCE(SUM(CASE WHEN transaction_type = 'payment' AND status = 'succeeded' THEN amount ELSE 0 END), 0)::BIGINT AS total_revenue,
    COALESCE(SUM(CASE WHEN transaction_type = 'payment' AND status = 'succeeded' THEN commission_amount ELSE 0 END), 0)::BIGINT AS total_commission,
    COALESCE(AVG(CASE WHEN transaction_type = 'payment' AND status = 'succeeded' THEN amount ELSE NULL END), 0)::NUMERIC AS avg_transaction_value,
    COUNT(CASE WHEN transaction_type = 'payment' AND status = 'succeeded' THEN 1 END)::BIGINT AS successful_payments,
    COUNT(CASE WHEN transaction_type = 'payment' AND status = 'failed' THEN 1 END)::BIGINT AS failed_payments,
    COUNT(CASE WHEN transaction_type = 'refund' THEN 1 END)::BIGINT AS refunds_count,
    COALESCE(SUM(CASE WHEN transaction_type = 'refund' THEN ABS(amount) ELSE 0 END), 0)::BIGINT AS refunds_amount
  FROM stripe_transactions
  WHERE
    partner_id = p_partner_id
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_partner_stats IS 'Retorna estatísticas detalhadas de um parceiro em um período';

-- =====================================================
-- 6. VIEWS
-- =====================================================

-- -----------------------------------------------------
-- View: partner_earnings_summary
-- Descrição: Resumo de ganhos por parceiro
-- -----------------------------------------------------
CREATE OR REPLACE VIEW partner_earnings_summary AS
SELECT
  psa.id,
  psa.partner_id,
  psa.stripe_account_id,
  psa.tier,
  psa.commission_rate,
  psa.total_earnings,
  psa.pending_balance,
  psa.available_balance,
  COUNT(st.id) FILTER (WHERE st.status = 'succeeded') AS successful_transactions,
  COUNT(st.id) FILTER (WHERE st.status = 'failed') AS failed_transactions,
  COUNT(st.id) FILTER (WHERE st.transaction_type = 'refund') AS refunds,
  COALESCE(SUM(st.amount) FILTER (WHERE st.status = 'succeeded' AND st.transaction_type = 'payment'), 0) AS total_revenue,
  psa.last_payout_at,
  psa.created_at
FROM partner_stripe_accounts psa
LEFT JOIN stripe_transactions st ON st.partner_id = psa.partner_id
GROUP BY psa.id;

COMMENT ON VIEW partner_earnings_summary IS 'Resumo consolidado de ganhos e transações por parceiro';

-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE partner_stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_payouts ENABLE ROW LEVEL SECURITY;

-- Políticas para partner_stripe_accounts
CREATE POLICY partner_stripe_accounts_select_policy ON partner_stripe_accounts
  FOR SELECT
  USING (
    auth.uid() = partner_id OR
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY partner_stripe_accounts_update_policy ON partner_stripe_accounts
  FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin');

-- Políticas para stripe_transactions
CREATE POLICY stripe_transactions_select_policy ON stripe_transactions
  FOR SELECT
  USING (
    auth.uid() = partner_id OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- Políticas para partner_payouts
CREATE POLICY partner_payouts_select_policy ON partner_payouts
  FOR SELECT
  USING (
    auth.uid() = partner_id OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- =====================================================
-- 8. DADOS INICIAIS (SEEDS)
-- =====================================================

-- Comentado por padrão - descomentar se necessário
/*
-- Exemplo de seed para teste
INSERT INTO partner_stripe_accounts (
  partner_id,
  stripe_account_id,
  tier,
  commission_rate,
  country,
  currency,
  business_name,
  email
) VALUES (
  '00000000-0000-0000-0000-000000000001', -- UUID do usuário de teste
  'acct_test_123',
  'starter',
  0.15,
  'BR',
  'brl',
  'Empresa Teste Ltda',
  'teste@parceiro.com'
);
*/

-- =====================================================
-- 9. GRANTS DE PERMISSÕES
-- =====================================================

-- Permissões para authenticated users
GRANT SELECT ON partner_stripe_accounts TO authenticated;
GRANT SELECT ON stripe_transactions TO authenticated;
GRANT SELECT ON partner_payouts TO authenticated;
GRANT SELECT ON partner_earnings_summary TO authenticated;

-- Permissões para service role (backend)
GRANT ALL ON partner_stripe_accounts TO service_role;
GRANT ALL ON stripe_transactions TO service_role;
GRANT ALL ON partner_payouts TO service_role;

-- =====================================================
-- FIM DO SCHEMA
-- =====================================================

-- Verificar instalação
DO $$
BEGIN
  RAISE NOTICE 'Stripe Connect Schema instalado com sucesso!';
  RAISE NOTICE 'Tabelas criadas: partner_stripe_accounts, stripe_transactions, partner_payouts';
  RAISE NOTICE 'Funções criadas: update_partner_balance, move_to_available_balance, deduct_payout, get_partner_stats';
  RAISE NOTICE 'Views criadas: partner_earnings_summary';
  RAISE NOTICE 'RLS habilitado em todas as tabelas';
END $$;
