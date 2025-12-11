-- =============================================
-- VIEWS NO SCHEMA PUBLIC PARA MIS SENTINEL
-- Redireciona consultas do public para mottivme_intelligence_system
-- Execute este SQL no Supabase SQL Editor
-- =============================================

-- 1. Messages (tabela principal de mensagens)
CREATE OR REPLACE VIEW public.messages AS
SELECT * FROM mottivme_intelligence_system.messages;

-- 2. Alerts (alertas do sistema)
CREATE OR REPLACE VIEW public.alerts AS
SELECT * FROM mottivme_intelligence_system.alerts;

-- 3. Alert Recipients
CREATE OR REPLACE VIEW public.alert_recipients AS
SELECT * FROM mottivme_intelligence_system.alert_recipients;

-- 4. Issues (problemas/tickets)
CREATE OR REPLACE VIEW public.issues AS
SELECT * FROM mottivme_intelligence_system.issues;

-- 5. Issue Actions (ações tomadas nos issues)
CREATE OR REPLACE VIEW public.issue_actions AS
SELECT * FROM mottivme_intelligence_system.issue_actions;

-- 6. Team Members (membros da equipe)
CREATE OR REPLACE VIEW public.team_members AS
SELECT * FROM mottivme_intelligence_system.team_members;

-- =============================================
-- NOVAS TABELAS PARA OS WORKFLOWS DO SENTINEL
-- Estas tabelas são criadas no schema mottivme_intelligence_system
-- e têm views no public para acesso
-- =============================================

-- 7. Sentinel Insights (insights gerados pela IA)
CREATE TABLE IF NOT EXISTS mottivme_intelligence_system.sentinel_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insight_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 0.0,
    metadata JSONB,
    processed_for_kb BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE VIEW public.sentinel_insights AS
SELECT * FROM mottivme_intelligence_system.sentinel_insights;

-- 8. Knowledge Base (FAQ, soluções, processos)
CREATE TABLE IF NOT EXISTS mottivme_intelligence_system.knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL, -- 'faq', 'solution', 'process', 'best_practice'
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    priority INTEGER DEFAULT 3,
    source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'sentinel_ai'
    source_insight_id UUID REFERENCES mottivme_intelligence_system.sentinel_insights(id),
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'published', 'archived'
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE VIEW public.knowledge_base AS
SELECT * FROM mottivme_intelligence_system.knowledge_base;

-- 9. Process Maps (mapas de processo)
CREATE TABLE IF NOT EXISTS mottivme_intelligence_system.process_maps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'atendimento', 'vendas', 'financeiro', 'suporte', 'onboarding', 'cancelamento'
    description TEXT,
    steps JSONB DEFAULT '[]', -- [{order, name, description, responsible, avg_time_minutes}]
    bottlenecks JSONB DEFAULT '[]', -- [string]
    optimization_suggestions JSONB DEFAULT '[]', -- [string]
    avg_resolution_time INTEGER DEFAULT 0, -- minutos
    success_rate DECIMAL(5,2) DEFAULT 0.0,
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'active', 'deprecated', 'review'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE VIEW public.process_maps AS
SELECT * FROM mottivme_intelligence_system.process_maps;

-- 10. Automation Opportunities (oportunidades de automação)
CREATE TABLE IF NOT EXISTS mottivme_intelligence_system.automation_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID REFERENCES mottivme_intelligence_system.process_maps(id),
    opportunity_description TEXT NOT NULL,
    estimated_time_saved_hours DECIMAL(10,2) DEFAULT 0,
    implementation_complexity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
    priority_score INTEGER DEFAULT 5, -- 1-10
    status VARCHAR(20) DEFAULT 'identified', -- 'identified', 'in_progress', 'implemented', 'rejected'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE VIEW public.automation_opportunities AS
SELECT * FROM mottivme_intelligence_system.automation_opportunities;

-- 11. Sales Metrics (métricas de vendas/BDR)
CREATE TABLE IF NOT EXISTS mottivme_intelligence_system.sales_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_member VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    prospections_count INTEGER DEFAULT 0,
    contacts_made INTEGER DEFAULT 0,
    meetings_scheduled INTEGER DEFAULT 0,
    proposals_sent INTEGER DEFAULT 0,
    deals_closed INTEGER DEFAULT 0,
    avg_time_between_prospections DECIMAL(10,2) DEFAULT 0, -- minutos
    total_prospection_time_minutes INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_member, date)
);

CREATE OR REPLACE VIEW public.sales_metrics AS
SELECT * FROM mottivme_intelligence_system.sales_metrics;

-- 12. Customer Engagement (engajamento de clientes)
CREATE TABLE IF NOT EXISTS mottivme_intelligence_system.customer_engagement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id VARCHAR(100) NOT NULL,
    customer_name VARCHAR(255),
    date DATE NOT NULL,
    messages_sent INTEGER DEFAULT 0,
    messages_received INTEGER DEFAULT 0,
    response_time_avg_hours DECIMAL(10,2) DEFAULT 0,
    engagement_score INTEGER DEFAULT 0, -- 0-100
    health_status VARCHAR(20) DEFAULT 'healthy', -- 'healthy', 'at_risk', 'critical'
    churn_risk_score INTEGER DEFAULT 0, -- 0-100
    last_interaction TIMESTAMPTZ,
    days_since_last_contact INTEGER DEFAULT 0,
    nps_score INTEGER, -- -10 a 10
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id, date)
);

CREATE OR REPLACE VIEW public.customer_engagement AS
SELECT * FROM mottivme_intelligence_system.customer_engagement;

-- 13. Team Performance (performance da equipe)
CREATE TABLE IF NOT EXISTS mottivme_intelligence_system.team_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_member VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    messages_handled INTEGER DEFAULT 0,
    issues_resolved INTEGER DEFAULT 0,
    avg_response_time_minutes DECIMAL(10,2) DEFAULT 0,
    customer_satisfaction_avg DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_member, date)
);

CREATE OR REPLACE VIEW public.team_performance AS
SELECT * FROM mottivme_intelligence_system.team_performance;

-- =============================================
-- PERMISSÕES
-- =============================================

-- Permissões para as views (SELECT via anon/authenticated)
GRANT SELECT ON public.messages TO anon, authenticated;
GRANT SELECT ON public.alerts TO anon, authenticated;
GRANT SELECT ON public.alert_recipients TO anon, authenticated;
GRANT SELECT ON public.issues TO anon, authenticated;
GRANT SELECT ON public.issue_actions TO anon, authenticated;
GRANT SELECT ON public.team_members TO anon, authenticated;
GRANT SELECT ON public.sentinel_insights TO anon, authenticated;
GRANT SELECT ON public.knowledge_base TO anon, authenticated;
GRANT SELECT ON public.process_maps TO anon, authenticated;
GRANT SELECT ON public.automation_opportunities TO anon, authenticated;
GRANT SELECT ON public.sales_metrics TO anon, authenticated;
GRANT SELECT ON public.customer_engagement TO anon, authenticated;
GRANT SELECT ON public.team_performance TO anon, authenticated;

-- Permissões de escrita nas tabelas originais (para service_role e authenticated)
GRANT ALL ON mottivme_intelligence_system.sentinel_insights TO service_role;
GRANT ALL ON mottivme_intelligence_system.knowledge_base TO service_role;
GRANT ALL ON mottivme_intelligence_system.process_maps TO service_role;
GRANT ALL ON mottivme_intelligence_system.automation_opportunities TO service_role;
GRANT ALL ON mottivme_intelligence_system.sales_metrics TO service_role;
GRANT ALL ON mottivme_intelligence_system.customer_engagement TO service_role;
GRANT ALL ON mottivme_intelligence_system.team_performance TO service_role;

-- Para insert/update via aplicação autenticada
GRANT INSERT, UPDATE ON mottivme_intelligence_system.sentinel_insights TO authenticated;
GRANT INSERT, UPDATE ON mottivme_intelligence_system.knowledge_base TO authenticated;
GRANT INSERT, UPDATE ON mottivme_intelligence_system.process_maps TO authenticated;
GRANT INSERT, UPDATE ON mottivme_intelligence_system.automation_opportunities TO authenticated;
GRANT INSERT, UPDATE ON mottivme_intelligence_system.sales_metrics TO authenticated;
GRANT INSERT, UPDATE ON mottivme_intelligence_system.customer_engagement TO authenticated;
GRANT INSERT, UPDATE ON mottivme_intelligence_system.team_performance TO authenticated;

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_sentinel_insights_type ON mottivme_intelligence_system.sentinel_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_sentinel_insights_processed ON mottivme_intelligence_system.sentinel_insights(processed_for_kb);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON mottivme_intelligence_system.knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_status ON mottivme_intelligence_system.knowledge_base(status);
CREATE INDEX IF NOT EXISTS idx_process_maps_category ON mottivme_intelligence_system.process_maps(category);
CREATE INDEX IF NOT EXISTS idx_sales_metrics_date ON mottivme_intelligence_system.sales_metrics(date);
CREATE INDEX IF NOT EXISTS idx_sales_metrics_member ON mottivme_intelligence_system.sales_metrics(team_member);
CREATE INDEX IF NOT EXISTS idx_customer_engagement_date ON mottivme_intelligence_system.customer_engagement(date);
CREATE INDEX IF NOT EXISTS idx_customer_engagement_health ON mottivme_intelligence_system.customer_engagement(health_status);

-- =============================================
-- DONE!
-- =============================================
SELECT 'Views e tabelas criadas com sucesso!' as status;
