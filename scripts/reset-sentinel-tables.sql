-- ============================================================================
-- MIS SENTINEL - RESET E CRIACAO DE TABELAS
-- ATENÇÃO: Este script REMOVE e RECRIA todas as tabelas
-- Schema: mottivme_intelligence_system
-- ============================================================================

-- ============================================================================
-- 0. DROP TABLES (ordem inversa por causa das foreign keys)
-- ============================================================================

DROP TABLE IF EXISTS mottivme_intelligence_system.automation_opportunities CASCADE;
DROP TABLE IF EXISTS mottivme_intelligence_system.process_maps CASCADE;
DROP TABLE IF EXISTS mottivme_intelligence_system.sales_metrics CASCADE;
DROP TABLE IF EXISTS mottivme_intelligence_system.customer_engagement CASCADE;
DROP TABLE IF EXISTS mottivme_intelligence_system.sentinel_insights CASCADE;
DROP TABLE IF EXISTS mottivme_intelligence_system.knowledge_base CASCADE;
DROP TABLE IF EXISTS mottivme_intelligence_system.issues CASCADE;

-- ============================================================================
-- 1. PROCESS MAPS - Mapeamento de Processos e Gargalos
-- ============================================================================

CREATE TABLE mottivme_intelligence_system.process_maps (
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

CREATE INDEX idx_process_maps_category ON mottivme_intelligence_system.process_maps(category);
CREATE INDEX idx_process_maps_status ON mottivme_intelligence_system.process_maps(status);

-- ============================================================================
-- 2. AUTOMATION OPPORTUNITIES
-- ============================================================================

CREATE TABLE mottivme_intelligence_system.automation_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID REFERENCES mottivme_intelligence_system.process_maps(id) ON DELETE SET NULL,
  opportunity_description TEXT NOT NULL,
  estimated_time_saved_hours DECIMAL(10,2) DEFAULT 0,
  implementation_complexity VARCHAR(20) DEFAULT 'medium' CHECK (implementation_complexity IN ('low', 'medium', 'high')),
  priority_score INTEGER DEFAULT 5 CHECK (priority_score >= 1 AND priority_score <= 10),
  status VARCHAR(50) DEFAULT 'identified' CHECK (status IN ('identified', 'in_progress', 'implemented', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_automation_opportunities_status ON mottivme_intelligence_system.automation_opportunities(status);
CREATE INDEX idx_automation_opportunities_priority ON mottivme_intelligence_system.automation_opportunities(priority_score DESC);

-- ============================================================================
-- 3. SALES METRICS
-- ============================================================================

CREATE TABLE mottivme_intelligence_system.sales_metrics (
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

CREATE INDEX idx_sales_metrics_date ON mottivme_intelligence_system.sales_metrics(date DESC);
CREATE INDEX idx_sales_metrics_member ON mottivme_intelligence_system.sales_metrics(team_member);

-- ============================================================================
-- 4. CUSTOMER ENGAGEMENT
-- ============================================================================

CREATE TABLE mottivme_intelligence_system.customer_engagement (
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

CREATE INDEX idx_customer_engagement_date ON mottivme_intelligence_system.customer_engagement(date DESC);
CREATE INDEX idx_customer_engagement_customer ON mottivme_intelligence_system.customer_engagement(customer_id);
CREATE INDEX idx_customer_engagement_health ON mottivme_intelligence_system.customer_engagement(health_status);
CREATE INDEX idx_customer_engagement_churn ON mottivme_intelligence_system.customer_engagement(churn_risk_score DESC);

-- ============================================================================
-- 5. SENTINEL INSIGHTS
-- ============================================================================

CREATE TABLE mottivme_intelligence_system.sentinel_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.8 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  metadata JSONB DEFAULT '{}'::jsonb,
  processed_for_kb BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sentinel_insights_type ON mottivme_intelligence_system.sentinel_insights(insight_type);
CREATE INDEX idx_sentinel_insights_created ON mottivme_intelligence_system.sentinel_insights(created_at DESC);

-- ============================================================================
-- 6. KNOWLEDGE BASE
-- ============================================================================

CREATE TABLE mottivme_intelligence_system.knowledge_base (
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

CREATE INDEX idx_knowledge_base_category ON mottivme_intelligence_system.knowledge_base(category);
CREATE INDEX idx_knowledge_base_status ON mottivme_intelligence_system.knowledge_base(status);
CREATE INDEX idx_knowledge_base_tags ON mottivme_intelligence_system.knowledge_base USING GIN(tags);

-- ============================================================================
-- 7. ISSUES
-- ============================================================================

CREATE TABLE mottivme_intelligence_system.issues (
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

CREATE INDEX idx_issues_status ON mottivme_intelligence_system.issues(status);
CREATE INDEX idx_issues_priority ON mottivme_intelligence_system.issues(priority);
CREATE INDEX idx_issues_detected ON mottivme_intelligence_system.issues(detected_at DESC);

-- ============================================================================
-- 8. ENABLE RLS E POLICIES
-- ============================================================================

ALTER TABLE mottivme_intelligence_system.process_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE mottivme_intelligence_system.automation_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE mottivme_intelligence_system.sales_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE mottivme_intelligence_system.customer_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE mottivme_intelligence_system.sentinel_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE mottivme_intelligence_system.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE mottivme_intelligence_system.issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access on process_maps" ON mottivme_intelligence_system.process_maps FOR ALL USING (true);
CREATE POLICY "Allow all access on automation_opportunities" ON mottivme_intelligence_system.automation_opportunities FOR ALL USING (true);
CREATE POLICY "Allow all access on sales_metrics" ON mottivme_intelligence_system.sales_metrics FOR ALL USING (true);
CREATE POLICY "Allow all access on customer_engagement" ON mottivme_intelligence_system.customer_engagement FOR ALL USING (true);
CREATE POLICY "Allow all access on sentinel_insights" ON mottivme_intelligence_system.sentinel_insights FOR ALL USING (true);
CREATE POLICY "Allow all access on knowledge_base" ON mottivme_intelligence_system.knowledge_base FOR ALL USING (true);
CREATE POLICY "Allow all access on issues" ON mottivme_intelligence_system.issues FOR ALL USING (true);

-- ============================================================================
-- 9. DADOS DE EXEMPLO
-- ============================================================================

-- Processos
INSERT INTO mottivme_intelligence_system.process_maps (process_name, category, description, steps, bottlenecks, optimization_suggestions, avg_resolution_time, success_rate, status) VALUES
('Atendimento Inicial - Dúvida Fatura', 'atendimento', 'Processo de atendimento para clientes com dúvidas sobre fatura',
  '[{"order": 1, "name": "Receber mensagem", "description": "Cliente envia dúvida pelo WhatsApp", "responsible": "Atendente", "avg_time_minutes": 2}, {"order": 2, "name": "Identificar cliente", "description": "Buscar dados do cliente no sistema", "responsible": "Atendente", "avg_time_minutes": 3}, {"order": 3, "name": "Analisar fatura", "description": "Verificar detalhes da fatura em questão", "responsible": "Atendente", "avg_time_minutes": 5}, {"order": 4, "name": "Responder cliente", "description": "Enviar explicação detalhada", "responsible": "Atendente", "avg_time_minutes": 5}]'::jsonb,
  '["Tempo de busca no sistema legado", "Múltiplas abas abertas para consulta"]'::jsonb,
  '["Integrar sistemas para consulta única", "Criar respostas template para dúvidas frequentes"]'::jsonb,
  15, 92.5, 'active'),
('Onboarding Novo Cliente', 'onboarding', 'Processo completo de onboarding para novos clientes',
  '[{"order": 1, "name": "Boas-vindas", "description": "Enviar mensagem de boas-vindas personalizada", "responsible": "CS", "avg_time_minutes": 5}, {"order": 2, "name": "Configuração inicial", "description": "Auxiliar cliente na configuração básica", "responsible": "CS", "avg_time_minutes": 30}, {"order": 3, "name": "Treinamento básico", "description": "Realizar treinamento sobre funcionalidades principais", "responsible": "CS", "avg_time_minutes": 60}, {"order": 4, "name": "Follow-up 7 dias", "description": "Verificar adaptação do cliente", "responsible": "CS", "avg_time_minutes": 15}]'::jsonb,
  '["Agendamento de treinamento demora", "Cliente não responde follow-up"]'::jsonb,
  '["Automatizar agendamento via bot", "Criar sequência de nurturing automatizada"]'::jsonb,
  120, 85.0, 'active'),
('Cancelamento - Retenção', 'cancelamento', 'Processo de retenção quando cliente solicita cancelamento',
  '[{"order": 1, "name": "Receber solicitação", "description": "Cliente manifesta desejo de cancelar", "responsible": "Atendente", "avg_time_minutes": 2}, {"order": 2, "name": "Entender motivo", "description": "Investigar razões do cancelamento", "responsible": "Atendente", "avg_time_minutes": 10}, {"order": 3, "name": "Oferecer alternativa", "description": "Apresentar opções de retenção", "responsible": "CS", "avg_time_minutes": 15}, {"order": 4, "name": "Processar decisão", "description": "Executar retenção ou cancelamento", "responsible": "CS", "avg_time_minutes": 10}]'::jsonb,
  '["Demora na escalação para CS", "Falta de autonomia para oferecer descontos"]'::jsonb,
  '["Criar playbook de retenção com autonomia", "Bot para triagem inicial de motivos"]'::jsonb,
  45, 65.0, 'active');

-- Oportunidades de automação
INSERT INTO mottivme_intelligence_system.automation_opportunities (process_id, opportunity_description, estimated_time_saved_hours, implementation_complexity, priority_score, status) VALUES
((SELECT id FROM mottivme_intelligence_system.process_maps WHERE process_name = 'Atendimento Inicial - Dúvida Fatura' LIMIT 1),
 'Criar bot para resposta automática de dúvidas frequentes sobre fatura', 40, 'medium', 8, 'identified'),
((SELECT id FROM mottivme_intelligence_system.process_maps WHERE process_name = 'Onboarding Novo Cliente' LIMIT 1),
 'Automatizar sequência de e-mails de onboarding com triggers baseados em ações do cliente', 25, 'high', 7, 'identified'),
((SELECT id FROM mottivme_intelligence_system.process_maps WHERE process_name = 'Cancelamento - Retenção' LIMIT 1),
 'Implementar análise de sentimento para priorização automática de casos de risco', 15, 'high', 9, 'in_progress');

-- Métricas de vendas (últimos 30 dias)
INSERT INTO mottivme_intelligence_system.sales_metrics (team_member, date, prospections_count, contacts_made, meetings_scheduled, proposals_sent, deals_closed, avg_time_between_prospections, total_prospection_time_minutes, conversion_rate)
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
INSERT INTO mottivme_intelligence_system.customer_engagement (customer_id, customer_name, date, messages_sent, messages_received, response_time_avg_hours, engagement_score, health_status, churn_risk_score, last_interaction, days_since_last_contact)
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
INSERT INTO mottivme_intelligence_system.knowledge_base (category, subcategory, title, content, tags, status, views_count, helpful_count) VALUES
('faq', 'faturamento', 'Como consultar minha fatura?', 'Para consultar sua fatura, acesse o portal do cliente em portal.mottivme.com e clique em "Minhas Faturas". Você pode visualizar, baixar em PDF ou solicitar segunda via.', ARRAY['fatura', 'portal', 'consulta'], 'published', 245, 89),
('faq', 'acesso', 'Esqueci minha senha, como recuperar?', 'Clique em "Esqueci minha senha" na tela de login. Um e-mail será enviado com instruções para criar uma nova senha. O link expira em 24 horas.', ARRAY['senha', 'recuperacao', 'acesso'], 'published', 532, 201),
('solution', 'integracoes', 'Integração com WhatsApp Business API', 'Passo a passo para configurar a integração com WhatsApp Business API: 1) Acessar configurações, 2) Selecionar "Integrações", 3) Clicar em "WhatsApp", 4) Inserir token da API.', ARRAY['whatsapp', 'integracao', 'api'], 'published', 178, 67),
('best_practice', 'atendimento', 'Tempo de resposta ideal no WhatsApp', 'O tempo de resposta ideal é de até 5 minutos durante horário comercial. Estudos mostram que respostas em até 5 min aumentam em 40% a satisfação do cliente.', ARRAY['atendimento', 'whatsapp', 'tempo'], 'published', 89, 34),
('process', 'vendas', 'Fluxo de qualificação de leads', 'Lead entra > Primeiro contato em 24h > Qualificação BANT > Score >= 70 > Passar para Closer. Score < 70 > Nurturing automático.', ARRAY['vendas', 'leads', 'qualificacao'], 'published', 156, 45);

-- Issues
INSERT INTO mottivme_intelligence_system.issues (title, description, category, priority, status, assigned_to, customer_id, customer_name, detected_at) VALUES
('Cliente não recebe notificações', 'Cliente reportou que não está recebendo notificações push há 3 dias', 'suporte_tecnico', 'high', 'in_progress', 'Arthur Lima', 'CUST-0001', 'Tech Solutions Ltda', NOW() - INTERVAL '2 days'),
('Lentidão no carregamento do dashboard', 'Múltiplos clientes reportando lentidão no dashboard principal', 'suporte_tecnico', 'critical', 'open', NULL, NULL, NULL, NOW() - INTERVAL '1 day'),
('Dúvida sobre cobrança adicional', 'Cliente questionando cobrança de R$150 não identificada', 'financeiro', 'medium', 'open', 'Isabella Santos', 'CUST-0003', 'E-commerce Brasil', NOW() - INTERVAL '4 hours'),
('Solicitação de relatório personalizado', 'Cliente VIP solicitou relatório customizado de métricas', 'solicitacao', 'low', 'open', NULL, 'CUST-0005', 'Corporate Services', NOW());

-- ============================================================================
-- 10. VERIFICAÇÃO
-- ============================================================================

SELECT 'MIS SENTINEL - Tabelas criadas com sucesso!' as status;

SELECT table_name,
       (SELECT COUNT(*) FROM information_schema.columns c
        WHERE c.table_name = t.table_name
        AND c.table_schema = 'mottivme_intelligence_system') as columns_count
FROM information_schema.tables t
WHERE table_schema = 'mottivme_intelligence_system'
ORDER BY table_name;
