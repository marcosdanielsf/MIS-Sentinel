-- ============================================================================
-- MIS SENTINEL - TABELAS ADICIONAIS
-- Tabelas para Process Maps, Sales Metrics e Customer Engagement
-- Schema: mottivme_intelligence_system
-- ============================================================================

-- ============================================================================
-- 1. PROCESS MAPS - Mapeamento de Processos e Gargalos
-- ============================================================================

CREATE TABLE IF NOT EXISTS mottivme_intelligence_system.process_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  process_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL, -- atendimento, vendas, financeiro, suporte, onboarding, cancelamento
  description TEXT,

  -- Estrutura do Processo
  steps JSONB DEFAULT '[]'::jsonb, -- Array de steps: [{order, name, description, responsible, avg_time_minutes}]
  bottlenecks JSONB DEFAULT '[]'::jsonb, -- Array de gargalos identificados
  optimization_suggestions JSONB DEFAULT '[]'::jsonb, -- Sugestões de otimização

  -- Métricas
  avg_resolution_time INTEGER DEFAULT 0, -- em minutos
  success_rate DECIMAL(5,2) DEFAULT 0, -- 0-100%

  -- Status
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'review', 'deprecated')),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_process_maps_category ON mottivme_intelligence_system.process_maps(category);
CREATE INDEX IF NOT EXISTS idx_process_maps_status ON mottivme_intelligence_system.process_maps(status);

-- ============================================================================
-- 2. AUTOMATION OPPORTUNITIES - Oportunidades de Automação
-- ============================================================================

CREATE TABLE IF NOT EXISTS mottivme_intelligence_system.automation_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relação com processo
  process_id UUID REFERENCES mottivme_intelligence_system.process_maps(id) ON DELETE SET NULL,

  -- Descrição
  opportunity_description TEXT NOT NULL,

  -- Estimativas
  estimated_time_saved_hours DECIMAL(10,2) DEFAULT 0, -- horas economizadas por mês
  implementation_complexity VARCHAR(20) DEFAULT 'medium' CHECK (implementation_complexity IN ('low', 'medium', 'high')),
  priority_score INTEGER DEFAULT 5 CHECK (priority_score >= 1 AND priority_score <= 10),

  -- Status
  status VARCHAR(50) DEFAULT 'identified' CHECK (status IN ('identified', 'in_progress', 'implemented', 'rejected')),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_opportunities_status ON mottivme_intelligence_system.automation_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_automation_opportunities_priority ON mottivme_intelligence_system.automation_opportunities(priority_score DESC);

-- ============================================================================
-- 3. SALES METRICS - Métricas de Prospecção BDR
-- ============================================================================

CREATE TABLE IF NOT EXISTS mottivme_intelligence_system.sales_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  team_member VARCHAR(255) NOT NULL,
  date DATE NOT NULL,

  -- Métricas de Prospecção
  prospections_count INTEGER DEFAULT 0,
  contacts_made INTEGER DEFAULT 0,
  meetings_scheduled INTEGER DEFAULT 0,
  proposals_sent INTEGER DEFAULT 0,
  deals_closed INTEGER DEFAULT 0,

  -- Tempo
  avg_time_between_prospections DECIMAL(10,2) DEFAULT 0, -- em minutos
  total_prospection_time_minutes INTEGER DEFAULT 0,

  -- Taxa de conversão calculada
  conversion_rate DECIMAL(5,2) DEFAULT 0, -- % de prospecções que viraram contatos

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint para evitar duplicatas
  UNIQUE(team_member, date)
);

CREATE INDEX IF NOT EXISTS idx_sales_metrics_date ON mottivme_intelligence_system.sales_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_metrics_member ON mottivme_intelligence_system.sales_metrics(team_member);

-- ============================================================================
-- 4. CUSTOMER ENGAGEMENT - Engajamento de Clientes (CS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mottivme_intelligence_system.customer_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação do Cliente
  customer_id VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,

  -- Métricas de Comunicação
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  response_time_avg_hours DECIMAL(10,2) DEFAULT 0,

  -- Scores
  engagement_score INTEGER DEFAULT 50 CHECK (engagement_score >= 0 AND engagement_score <= 100),
  churn_risk_score INTEGER DEFAULT 0 CHECK (churn_risk_score >= 0 AND churn_risk_score <= 100),
  nps_score INTEGER CHECK (nps_score >= -100 AND nps_score <= 100),

  -- Status de Saúde
  health_status VARCHAR(20) DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'at_risk', 'critical')),

  -- Último Contato
  last_interaction TIMESTAMPTZ,
  days_since_last_contact INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint para evitar duplicatas
  UNIQUE(customer_id, date)
);

CREATE INDEX IF NOT EXISTS idx_customer_engagement_date ON mottivme_intelligence_system.customer_engagement(date DESC);
CREATE INDEX IF NOT EXISTS idx_customer_engagement_customer ON mottivme_intelligence_system.customer_engagement(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_engagement_health ON mottivme_intelligence_system.customer_engagement(health_status);
CREATE INDEX IF NOT EXISTS idx_customer_engagement_churn ON mottivme_intelligence_system.customer_engagement(churn_risk_score DESC);

-- ============================================================================
-- 5. SENTINEL INSIGHTS - Insights gerados pelo SENTINEL AI
-- ============================================================================

CREATE TABLE IF NOT EXISTS mottivme_intelligence_system.sentinel_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tipo de Insight
  insight_type VARCHAR(100) NOT NULL, -- process_bottleneck, sales_trend, engagement_alert, etc

  -- Conteúdo
  content TEXT NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.8 CHECK (confidence_score >= 0 AND confidence_score <= 1),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  processed_for_kb BOOLEAN DEFAULT FALSE, -- Se foi processado para Knowledge Base

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sentinel_insights_type ON mottivme_intelligence_system.sentinel_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_sentinel_insights_created ON mottivme_intelligence_system.sentinel_insights(created_at DESC);

-- ============================================================================
-- 6. KNOWLEDGE BASE - Base de Conhecimento
-- ============================================================================

CREATE TABLE IF NOT EXISTS mottivme_intelligence_system.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Classificação
  category VARCHAR(100) NOT NULL, -- faq, solution, best_practice, process, template
  subcategory VARCHAR(100),

  -- Conteúdo
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  tags VARCHAR(255)[] DEFAULT '{}',

  -- Métricas
  views_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,

  -- Status
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),

  -- Metadata
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON mottivme_intelligence_system.knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_status ON mottivme_intelligence_system.knowledge_base(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_tags ON mottivme_intelligence_system.knowledge_base USING GIN(tags);

-- ============================================================================
-- 7. ISSUES - Problemas/Chamados
-- ============================================================================

CREATE TABLE IF NOT EXISTS mottivme_intelligence_system.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  title VARCHAR(500) NOT NULL,
  description TEXT,

  -- Classificação
  category VARCHAR(100),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  -- Status
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'escalated', 'resolved', 'closed')),

  -- Atribuição
  assigned_to VARCHAR(255),
  reported_by VARCHAR(255),

  -- Relacionamentos
  customer_id VARCHAR(255),
  customer_name VARCHAR(255),
  related_message_ids UUID[],

  -- Resolução
  resolution TEXT,
  resolution_time_hours DECIMAL(10,2),

  -- Datas
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issues_status ON mottivme_intelligence_system.issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_priority ON mottivme_intelligence_system.issues(priority);
CREATE INDEX IF NOT EXISTS idx_issues_detected ON mottivme_intelligence_system.issues(detected_at DESC);

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

-- Policies para acesso público (ajustar conforme necessidade de segurança)
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

-- Processos de exemplo
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
  45, 65.0, 'active')
ON CONFLICT DO NOTHING;

-- Oportunidades de automação de exemplo
INSERT INTO mottivme_intelligence_system.automation_opportunities (process_id, opportunity_description, estimated_time_saved_hours, implementation_complexity, priority_score, status) VALUES
((SELECT id FROM mottivme_intelligence_system.process_maps WHERE process_name = 'Atendimento Inicial - Dúvida Fatura' LIMIT 1),
 'Criar bot para resposta automática de dúvidas frequentes sobre fatura', 40, 'medium', 8, 'identified'),
((SELECT id FROM mottivme_intelligence_system.process_maps WHERE process_name = 'Onboarding Novo Cliente' LIMIT 1),
 'Automatizar sequência de e-mails de onboarding com triggers baseados em ações do cliente', 25, 'high', 7, 'identified'),
((SELECT id FROM mottivme_intelligence_system.process_maps WHERE process_name = 'Cancelamento - Retenção' LIMIT 1),
 'Implementar análise de sentimento para priorização automática de casos de risco', 15, 'high', 9, 'in_progress')
ON CONFLICT DO NOTHING;

-- Métricas de vendas de exemplo (últimos 30 dias)
INSERT INTO mottivme_intelligence_system.sales_metrics (team_member, date, prospections_count, contacts_made, meetings_scheduled, proposals_sent, deals_closed, avg_time_between_prospections, total_prospection_time_minutes, conversion_rate)
SELECT
  member,
  d::date,
  FLOOR(RANDOM() * 30 + 10)::INTEGER, -- 10-40 prospecções
  FLOOR(RANDOM() * 15 + 5)::INTEGER, -- 5-20 contatos
  FLOOR(RANDOM() * 5 + 1)::INTEGER, -- 1-6 reuniões
  FLOOR(RANDOM() * 3)::INTEGER, -- 0-3 propostas
  FLOOR(RANDOM() * 2)::INTEGER, -- 0-2 fechamentos
  ROUND((RANDOM() * 10 + 5)::NUMERIC, 1), -- 5-15 min entre prospecções
  FLOOR(RANDOM() * 120 + 60)::INTEGER, -- 60-180 min total
  ROUND((RANDOM() * 30 + 10)::NUMERIC, 1) -- 10-40% conversão
FROM unnest(ARRAY['Marcos Daniels', 'Isabella Santos', 'Arthur Lima', 'Allesson Costa']) AS member,
     generate_series(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, '1 day') AS d
ON CONFLICT (team_member, date) DO NOTHING;

-- Engajamento de clientes de exemplo
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
     generate_series(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, '1 day') AS d
ON CONFLICT (customer_id, date) DO NOTHING;

-- Knowledge Base de exemplo
INSERT INTO mottivme_intelligence_system.knowledge_base (category, subcategory, title, content, tags, status, views_count, helpful_count) VALUES
('faq', 'faturamento', 'Como consultar minha fatura?', 'Para consultar sua fatura, acesse o portal do cliente em portal.mottivme.com e clique em "Minhas Faturas". Você pode visualizar, baixar em PDF ou solicitar segunda via.', ARRAY['fatura', 'portal', 'consulta'], 'published', 245, 89),
('faq', 'acesso', 'Esqueci minha senha, como recuperar?', 'Clique em "Esqueci minha senha" na tela de login. Um e-mail será enviado com instruções para criar uma nova senha. O link expira em 24 horas.', ARRAY['senha', 'recuperação', 'acesso'], 'published', 532, 201),
('solution', 'integrações', 'Integração com WhatsApp Business API', 'Passo a passo para configurar a integração com WhatsApp Business API: 1) Acessar configurações, 2) Selecionar "Integrações", 3) Clicar em "WhatsApp", 4) Inserir token da API.', ARRAY['whatsapp', 'integração', 'api'], 'published', 178, 67),
('best_practice', 'atendimento', 'Tempo de resposta ideal no WhatsApp', 'O tempo de resposta ideal é de até 5 minutos durante horário comercial. Estudos mostram que respostas em até 5 min aumentam em 40% a satisfação do cliente.', ARRAY['atendimento', 'whatsapp', 'tempo'], 'published', 89, 34),
('process', 'vendas', 'Fluxo de qualificação de leads', 'Lead entra > Primeiro contato em 24h > Qualificação BANT > Score >= 70 > Passar para Closer. Score < 70 > Nurturing automático.', ARRAY['vendas', 'leads', 'qualificação'], 'published', 156, 45)
ON CONFLICT DO NOTHING;

-- Issues de exemplo
INSERT INTO mottivme_intelligence_system.issues (title, description, category, priority, status, assigned_to, customer_id, customer_name, detected_at) VALUES
('Cliente não recebe notificações', 'Cliente reportou que não está recebendo notificações push há 3 dias', 'suporte_tecnico', 'high', 'in_progress', 'Arthur Lima', 'CUST-0001', 'Tech Solutions Ltda', NOW() - INTERVAL '2 days'),
('Lentidão no carregamento do dashboard', 'Múltiplos clientes reportando lentidão no dashboard principal', 'suporte_tecnico', 'critical', 'open', NULL, NULL, NULL, NOW() - INTERVAL '1 day'),
('Dúvida sobre cobrança adicional', 'Cliente questionando cobrança de R$150 não identificada', 'financeiro', 'medium', 'open', 'Isabella Santos', 'CUST-0003', 'E-commerce Brasil', NOW() - INTERVAL '4 hours'),
('Solicitação de relatório personalizado', 'Cliente VIP solicitou relatório customizado de métricas', 'solicitacao', 'low', 'open', NULL, 'CUST-0005', 'Corporate Services', NOW())
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 10. VERIFICAÇÃO
-- ============================================================================

SELECT 'MIS SENTINEL - Tabelas criadas com sucesso!' as status;

SELECT table_name,
       (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'mottivme_intelligence_system') as columns_count
FROM information_schema.tables t
WHERE table_schema = 'mottivme_intelligence_system'
ORDER BY table_name;
