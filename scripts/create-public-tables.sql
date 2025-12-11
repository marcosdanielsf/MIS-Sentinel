-- ============================================================================
-- MIS SENTINEL - CRIACAO DE TABELAS NO SCHEMA PUBLIC
-- Execute este script no Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 0. DROP TABLES (ordem inversa por causa das foreign keys)
-- ============================================================================

DROP TABLE IF EXISTS public.automation_opportunities CASCADE;
DROP TABLE IF EXISTS public.process_maps CASCADE;
DROP TABLE IF EXISTS public.sales_metrics CASCADE;
DROP TABLE IF EXISTS public.customer_engagement CASCADE;
DROP TABLE IF EXISTS public.sentinel_insights CASCADE;
DROP TABLE IF EXISTS public.knowledge_base CASCADE;
DROP TABLE IF EXISTS public.issues CASCADE;
DROP TABLE IF EXISTS public.issue_actions CASCADE;

-- ============================================================================
-- 1. PROCESS MAPS - Mapeamento de Processos e Gargalos
-- ============================================================================

CREATE TABLE public.process_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  steps JSONB DEFAULT '[]'::jsonb,
  bottlenecks JSONB DEFAULT '[]'::jsonb,
  optimization_suggestions JSONB DEFAULT '[]'::jsonb,
  avg_resolution_time INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'review', 'deprecated')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_process_maps_category ON public.process_maps(category);
CREATE INDEX idx_process_maps_status ON public.process_maps(status);

-- ============================================================================
-- 2. AUTOMATION OPPORTUNITIES
-- ============================================================================

CREATE TABLE public.automation_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID REFERENCES public.process_maps(id) ON DELETE SET NULL,
  opportunity_description TEXT NOT NULL,
  estimated_time_saved_hours DECIMAL(10,2) DEFAULT 0,
  implementation_complexity VARCHAR(20) DEFAULT 'medium' CHECK (implementation_complexity IN ('low', 'medium', 'high')),
  priority_score INTEGER DEFAULT 5 CHECK (priority_score >= 1 AND priority_score <= 10),
  status VARCHAR(50) DEFAULT 'identified' CHECK (status IN ('identified', 'in_progress', 'implemented', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_automation_opportunities_status ON public.automation_opportunities(status);
CREATE INDEX idx_automation_opportunities_priority ON public.automation_opportunities(priority_score DESC);

-- ============================================================================
-- 3. SALES METRICS
-- ============================================================================

CREATE TABLE public.sales_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  prospections_count INTEGER DEFAULT 0,
  contacts_made INTEGER DEFAULT 0,
  meetings_scheduled INTEGER DEFAULT 0,
  proposals_sent INTEGER DEFAULT 0,
  deals_closed INTEGER DEFAULT 0,
  avg_time_between_prospections DECIMAL(10,2) DEFAULT 0,
  total_prospection_time_minutes INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_member, date)
);

CREATE INDEX idx_sales_metrics_date ON public.sales_metrics(date DESC);
CREATE INDEX idx_sales_metrics_member ON public.sales_metrics(team_member);

-- ============================================================================
-- 4. CUSTOMER ENGAGEMENT
-- ============================================================================

CREATE TABLE public.customer_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  response_time_avg_hours DECIMAL(10,2) DEFAULT 0,
  engagement_score INTEGER DEFAULT 50 CHECK (engagement_score >= 0 AND engagement_score <= 100),
  churn_risk_score INTEGER DEFAULT 0 CHECK (churn_risk_score >= 0 AND churn_risk_score <= 100),
  nps_score INTEGER CHECK (nps_score >= -100 AND nps_score <= 100),
  health_status VARCHAR(20) DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'at_risk', 'critical')),
  last_interaction TIMESTAMPTZ,
  days_since_last_contact INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, date)
);

CREATE INDEX idx_customer_engagement_date ON public.customer_engagement(date DESC);
CREATE INDEX idx_customer_engagement_customer ON public.customer_engagement(customer_id);
CREATE INDEX idx_customer_engagement_health ON public.customer_engagement(health_status);
CREATE INDEX idx_customer_engagement_churn ON public.customer_engagement(churn_risk_score DESC);

-- ============================================================================
-- 5. SENTINEL INSIGHTS
-- ============================================================================

CREATE TABLE public.sentinel_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.8 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  metadata JSONB DEFAULT '{}'::jsonb,
  processed_for_kb BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sentinel_insights_type ON public.sentinel_insights(insight_type);
CREATE INDEX idx_sentinel_insights_created ON public.sentinel_insights(created_at DESC);

-- ============================================================================
-- 6. KNOWLEDGE BASE
-- ============================================================================

CREATE TABLE public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  tags VARCHAR(255)[] DEFAULT '{}',
  views_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_base_category ON public.knowledge_base(category);
CREATE INDEX idx_knowledge_base_status ON public.knowledge_base(status);
CREATE INDEX idx_knowledge_base_tags ON public.knowledge_base USING GIN(tags);

-- ============================================================================
-- 7. ISSUES
-- ============================================================================

CREATE TABLE public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'escalated', 'resolved', 'closed')),
  assigned_to VARCHAR(255),
  reported_by VARCHAR(255),
  customer_id VARCHAR(255),
  customer_name VARCHAR(255),
  related_message_ids UUID[],
  resolution TEXT,
  resolution_time_hours DECIMAL(10,2),
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_issues_status ON public.issues(status);
CREATE INDEX idx_issues_priority ON public.issues(priority);
CREATE INDEX idx_issues_detected ON public.issues(detected_at DESC);

-- ============================================================================
-- 8. ISSUE ACTIONS
-- ============================================================================

CREATE TABLE public.issue_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL,
  action_description TEXT NOT NULL,
  taken_by VARCHAR(255) DEFAULT 'SYSTEM_AUTO',
  success BOOLEAN DEFAULT TRUE,
  customer_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_issue_actions_issue ON public.issue_actions(issue_id);
CREATE INDEX idx_issue_actions_type ON public.issue_actions(action_type);

-- ============================================================================
-- 9. ENABLE RLS E POLICIES
-- ============================================================================

ALTER TABLE public.process_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentinel_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access on process_maps" ON public.process_maps FOR ALL USING (true);
CREATE POLICY "Allow all access on automation_opportunities" ON public.automation_opportunities FOR ALL USING (true);
CREATE POLICY "Allow all access on sales_metrics" ON public.sales_metrics FOR ALL USING (true);
CREATE POLICY "Allow all access on customer_engagement" ON public.customer_engagement FOR ALL USING (true);
CREATE POLICY "Allow all access on sentinel_insights" ON public.sentinel_insights FOR ALL USING (true);
CREATE POLICY "Allow all access on knowledge_base" ON public.knowledge_base FOR ALL USING (true);
CREATE POLICY "Allow all access on issues" ON public.issues FOR ALL USING (true);
CREATE POLICY "Allow all access on issue_actions" ON public.issue_actions FOR ALL USING (true);

-- ============================================================================
-- 10. DADOS DE EXEMPLO
-- ============================================================================

-- Processos
INSERT INTO public.process_maps (process_name, category, description, steps, bottlenecks, optimization_suggestions, avg_resolution_time, success_rate, status) VALUES
('Atendimento Inicial - Duvida Fatura', 'atendimento', 'Processo de atendimento para clientes com duvidas sobre fatura',
  '[{"order": 1, "name": "Receber mensagem", "description": "Cliente envia duvida pelo WhatsApp", "responsible": "Atendente", "avg_time_minutes": 2}, {"order": 2, "name": "Identificar cliente", "description": "Buscar dados do cliente no sistema", "responsible": "Atendente", "avg_time_minutes": 3}, {"order": 3, "name": "Analisar fatura", "description": "Verificar detalhes da fatura em questao", "responsible": "Atendente", "avg_time_minutes": 5}, {"order": 4, "name": "Responder cliente", "description": "Enviar explicacao detalhada", "responsible": "Atendente", "avg_time_minutes": 5}]'::jsonb,
  '["Tempo de busca no sistema legado", "Multiplas abas abertas para consulta"]'::jsonb,
  '["Integrar sistemas para consulta unica", "Criar respostas template para duvidas frequentes"]'::jsonb,
  15, 92.5, 'active'),
('Onboarding Novo Cliente', 'onboarding', 'Processo completo de onboarding para novos clientes',
  '[{"order": 1, "name": "Boas-vindas", "description": "Enviar mensagem de boas-vindas personalizada", "responsible": "CS", "avg_time_minutes": 5}, {"order": 2, "name": "Configuracao inicial", "description": "Auxiliar cliente na configuracao basica", "responsible": "CS", "avg_time_minutes": 30}, {"order": 3, "name": "Treinamento basico", "description": "Realizar treinamento sobre funcionalidades principais", "responsible": "CS", "avg_time_minutes": 60}, {"order": 4, "name": "Follow-up 7 dias", "description": "Verificar adaptacao do cliente", "responsible": "CS", "avg_time_minutes": 15}]'::jsonb,
  '["Agendamento de treinamento demora", "Cliente nao responde follow-up"]'::jsonb,
  '["Automatizar agendamento via bot", "Criar sequencia de nurturing automatizada"]'::jsonb,
  120, 85.0, 'active'),
('Cancelamento - Retencao', 'cancelamento', 'Processo de retencao quando cliente solicita cancelamento',
  '[{"order": 1, "name": "Receber solicitacao", "description": "Cliente manifesta desejo de cancelar", "responsible": "Atendente", "avg_time_minutes": 2}, {"order": 2, "name": "Entender motivo", "description": "Investigar razoes do cancelamento", "responsible": "Atendente", "avg_time_minutes": 10}, {"order": 3, "name": "Oferecer alternativa", "description": "Apresentar opcoes de retencao", "responsible": "CS", "avg_time_minutes": 15}, {"order": 4, "name": "Processar decisao", "description": "Executar retencao ou cancelamento", "responsible": "CS", "avg_time_minutes": 10}]'::jsonb,
  '["Demora na escalacao para CS", "Falta de autonomia para oferecer descontos"]'::jsonb,
  '["Criar playbook de retencao com autonomia", "Bot para triagem inicial de motivos"]'::jsonb,
  45, 65.0, 'active');

-- Oportunidades de automacao
INSERT INTO public.automation_opportunities (process_id, opportunity_description, estimated_time_saved_hours, implementation_complexity, priority_score, status) VALUES
((SELECT id FROM public.process_maps WHERE process_name = 'Atendimento Inicial - Duvida Fatura' LIMIT 1),
 'Criar bot para resposta automatica de duvidas frequentes sobre fatura', 40, 'medium', 8, 'identified'),
((SELECT id FROM public.process_maps WHERE process_name = 'Onboarding Novo Cliente' LIMIT 1),
 'Automatizar sequencia de e-mails de onboarding com triggers baseados em acoes do cliente', 25, 'high', 7, 'identified'),
((SELECT id FROM public.process_maps WHERE process_name = 'Cancelamento - Retencao' LIMIT 1),
 'Implementar analise de sentimento para priorizacao automatica de casos de risco', 15, 'high', 9, 'in_progress');

-- Metricas de vendas (ultimos 30 dias)
INSERT INTO public.sales_metrics (team_member, date, prospections_count, contacts_made, meetings_scheduled, proposals_sent, deals_closed, avg_time_between_prospections, total_prospection_time_minutes, conversion_rate)
SELECT
  member,
  d::date,
  FLOOR(RANDOM() * 30 + 10)::INTEGER,
  FLOOR(RANDOM() * 15 + 5)::INTEGER,
  FLOOR(RANDOM() * 5 + 1)::INTEGER,
  FLOOR(RANDOM() * 3)::INTEGER,
  FLOOR(RANDOM() * 2)::INTEGER,
  ROUND((RANDOM() * 10 + 5)::NUMERIC, 1),
  FLOOR(RANDOM() * 120 + 60)::INTEGER,
  ROUND((RANDOM() * 30 + 10)::NUMERIC, 1)
FROM unnest(ARRAY['Marcos Daniels', 'Isabella Santos', 'Arthur Lima', 'Allesson Costa']) AS member,
     generate_series(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, '1 day') AS d;

-- Engajamento de clientes
INSERT INTO public.customer_engagement (customer_id, customer_name, date, messages_sent, messages_received, response_time_avg_hours, engagement_score, health_status, churn_risk_score, last_interaction, days_since_last_contact)
SELECT
  'CUST-' || LPAD(cust_num::TEXT, 4, '0'),
  CASE cust_num
    WHEN 1 THEN 'Tech Solutions Ltda'
    WHEN 2 THEN 'Digital Marketing Co'
    WHEN 3 THEN 'E-commerce Brasil'
    WHEN 4 THEN 'Startup Innovation'
    WHEN 5 THEN 'Corporate Services'
    WHEN 6 THEN 'Health Tech Inc'
    WHEN 7 THEN 'Education Plus'
    WHEN 8 THEN 'Finance Solutions'
    ELSE 'Cliente ' || cust_num
  END,
  d::date,
  FLOOR(RANDOM() * 10 + 1)::INTEGER,
  FLOOR(RANDOM() * 8 + 1)::INTEGER,
  ROUND((RANDOM() * 20 + 2)::NUMERIC, 1),
  FLOOR(RANDOM() * 60 + 30)::INTEGER,
  CASE
    WHEN RANDOM() < 0.6 THEN 'healthy'
    WHEN RANDOM() < 0.85 THEN 'at_risk'
    ELSE 'critical'
  END,
  FLOOR(RANDOM() * 70)::INTEGER,
  d - (FLOOR(RANDOM() * 7)::INTEGER || ' days')::INTERVAL,
  FLOOR(RANDOM() * 14)::INTEGER
FROM generate_series(1, 10) AS cust_num,
     generate_series(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, '1 day') AS d;

-- Knowledge Base
INSERT INTO public.knowledge_base (category, subcategory, title, content, tags, status, views_count, helpful_count) VALUES
('faq', 'faturamento', 'Como consultar minha fatura?', 'Para consultar sua fatura, acesse o portal do cliente em portal.mottivme.com e clique em "Minhas Faturas". Voce pode visualizar, baixar em PDF ou solicitar segunda via.', ARRAY['fatura', 'portal', 'consulta'], 'published', 245, 89),
('faq', 'acesso', 'Esqueci minha senha, como recuperar?', 'Clique em "Esqueci minha senha" na tela de login. Um e-mail sera enviado com instrucoes para criar uma nova senha. O link expira em 24 horas.', ARRAY['senha', 'recuperacao', 'acesso'], 'published', 532, 201),
('solution', 'integracoes', 'Integracao com WhatsApp Business API', 'Passo a passo para configurar a integracao com WhatsApp Business API: 1) Acessar configuracoes, 2) Selecionar "Integracoes", 3) Clicar em "WhatsApp", 4) Inserir token da API.', ARRAY['whatsapp', 'integracao', 'api'], 'published', 178, 67),
('best_practice', 'atendimento', 'Tempo de resposta ideal no WhatsApp', 'O tempo de resposta ideal e de ate 5 minutos durante horario comercial. Estudos mostram que respostas em ate 5 min aumentam em 40% a satisfacao do cliente.', ARRAY['atendimento', 'whatsapp', 'tempo'], 'published', 89, 34),
('process', 'vendas', 'Fluxo de qualificacao de leads', 'Lead entra > Primeiro contato em 24h > Qualificacao BANT > Score >= 70 > Passar para Closer. Score < 70 > Nurturing automatico.', ARRAY['vendas', 'leads', 'qualificacao'], 'published', 156, 45);

-- Issues
INSERT INTO public.issues (title, description, category, priority, status, assigned_to, customer_id, customer_name, detected_at) VALUES
('Cliente nao recebe notificacoes', 'Cliente reportou que nao esta recebendo notificacoes push ha 3 dias', 'suporte_tecnico', 'high', 'in_progress', 'Arthur Lima', 'CUST-0001', 'Tech Solutions Ltda', NOW() - INTERVAL '2 days'),
('Lentidao no carregamento do dashboard', 'Multiplos clientes reportando lentidao no dashboard principal', 'suporte_tecnico', 'critical', 'open', NULL, NULL, NULL, NOW() - INTERVAL '1 day'),
('Duvida sobre cobranca adicional', 'Cliente questionando cobranca de R$150 nao identificada', 'financeiro', 'medium', 'open', 'Isabella Santos', 'CUST-0003', 'E-commerce Brasil', NOW() - INTERVAL '4 hours'),
('Solicitacao de relatorio personalizado', 'Cliente VIP solicitou relatorio customizado de metricas', 'solicitacao', 'low', 'open', NULL, 'CUST-0005', 'Corporate Services', NOW());

-- ============================================================================
-- 11. VERIFICACAO
-- ============================================================================

SELECT 'MIS SENTINEL - Tabelas criadas com sucesso no schema PUBLIC!' as status;

SELECT table_name,
       (SELECT COUNT(*) FROM information_schema.columns c
        WHERE c.table_name = t.table_name
        AND c.table_schema = 'public') as columns_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('process_maps', 'automation_opportunities', 'sales_metrics', 'customer_engagement', 'sentinel_insights', 'knowledge_base', 'issues', 'issue_actions')
ORDER BY table_name;
