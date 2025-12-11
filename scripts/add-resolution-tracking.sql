-- ============================================================================
-- MIS SENTINEL - RESOLUTION TRACKING SYSTEM
-- Transforma dashboard passivo em sistema ativo de resolução de problemas
-- Baseado em Customer Resolution Time (CRT) - Jeff Bezos approach
-- ============================================================================

-- 1. Tabela de ISSUES (problemas identificados pelos alertas)
CREATE TABLE IF NOT EXISTS mottivme_intelligence_system.issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID REFERENCES mottivme_intelligence_system.alerts(id),

  -- Identificação do problema
  issue_type VARCHAR(50) NOT NULL, -- 'customer_complaint', 'team_conflict', 'urgent_request', etc
  customer_name VARCHAR(255), -- Nome do cliente afetado
  customer_phone VARCHAR(50),

  -- Métricas de tempo (CRT)
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_response_at TIMESTAMPTZ, -- Primeira ação tomada
  resolved_at TIMESTAMPTZ, -- Quando foi resolvido

  -- Status
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'escalated', 'closed')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  -- Ownership
  assigned_to VARCHAR(255), -- Quem está resolvendo
  escalated_to VARCHAR(255), -- Para quem foi escalado
  escalated_at TIMESTAMPTZ,

  -- Resolução
  resolution_notes TEXT,
  customer_satisfaction INTEGER CHECK (customer_satisfaction BETWEEN 1 AND 5), -- 1-5 stars

  -- Métricas calculadas (em minutos)
  time_to_first_response INTEGER, -- Minutos até primeira ação
  time_to_resolution INTEGER, -- Minutos até resolver

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de ACTIONS (ações tomadas para resolver)
CREATE TABLE IF NOT EXISTS mottivme_intelligence_system.issue_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_id UUID REFERENCES mottivme_intelligence_system.issues(id) ON DELETE CASCADE,

  action_type VARCHAR(50) NOT NULL, -- 'message_sent', 'call_made', 'escalated', 'automated_response'
  action_description TEXT NOT NULL,

  -- Quem/o que tomou a ação
  taken_by VARCHAR(255), -- Pessoa ou 'SYSTEM_AUTO' para ações automáticas
  taken_at TIMESTAMPTZ DEFAULT NOW(),

  -- Resultado
  success BOOLEAN DEFAULT TRUE,
  customer_response TEXT, -- Se houve resposta do cliente

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. View para CRT Dashboard (Customer Resolution Time)
CREATE OR REPLACE VIEW mottivme_intelligence_system.crt_metrics AS
SELECT
  -- Métricas de hoje
  COUNT(*) FILTER (WHERE detected_at >= CURRENT_DATE) as issues_today,
  COUNT(*) FILTER (WHERE detected_at >= CURRENT_DATE AND status = 'resolved') as resolved_today,
  COUNT(*) FILTER (WHERE status = 'open' OR status = 'in_progress') as currently_open,
  COUNT(*) FILTER (WHERE status = 'escalated') as currently_escalated,

  -- CRT médios (em minutos)
  AVG(time_to_first_response) FILTER (WHERE detected_at >= CURRENT_DATE) as avg_response_time_today,
  AVG(time_to_resolution) FILTER (WHERE resolved_at >= CURRENT_DATE) as avg_resolution_time_today,

  -- CRT dos últimos 7 dias
  AVG(time_to_first_response) FILTER (WHERE detected_at >= CURRENT_DATE - INTERVAL '7 days') as avg_response_time_7d,
  AVG(time_to_resolution) FILTER (WHERE resolved_at >= CURRENT_DATE - INTERVAL '7 days') as avg_resolution_time_7d,

  -- Satisfação do cliente
  AVG(customer_satisfaction) FILTER (WHERE resolved_at >= CURRENT_DATE - INTERVAL '7 days') as avg_satisfaction_7d,

  -- Taxa de resolução
  (COUNT(*) FILTER (WHERE resolved_at >= CURRENT_DATE - INTERVAL '7 days' AND status = 'resolved')::FLOAT /
   NULLIF(COUNT(*) FILTER (WHERE detected_at >= CURRENT_DATE - INTERVAL '7 days'), 0)) * 100 as resolution_rate_7d
FROM mottivme_intelligence_system.issues;

-- 4. View para Top Issues (problemas mais frequentes)
CREATE OR REPLACE VIEW mottivme_intelligence_system.top_issues AS
SELECT
  issue_type,
  COUNT(*) as occurrences,
  AVG(time_to_resolution) as avg_resolution_time,
  COUNT(*) FILTER (WHERE status = 'open' OR status = 'in_progress') as currently_open,
  AVG(customer_satisfaction) as avg_satisfaction
FROM mottivme_intelligence_system.issues
WHERE detected_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY issue_type
ORDER BY occurrences DESC
LIMIT 10;

-- 5. Função para auto-calcular métricas de tempo
CREATE OR REPLACE FUNCTION mottivme_intelligence_system.update_issue_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcular time_to_first_response
  IF NEW.first_response_at IS NOT NULL AND OLD.first_response_at IS NULL THEN
    NEW.time_to_first_response = EXTRACT(EPOCH FROM (NEW.first_response_at - NEW.detected_at)) / 60;
  END IF;

  -- Calcular time_to_resolution
  IF NEW.resolved_at IS NOT NULL AND OLD.resolved_at IS NULL THEN
    NEW.time_to_resolution = EXTRACT(EPOCH FROM (NEW.resolved_at - NEW.detected_at)) / 60;
  END IF;

  -- Atualizar updated_at
  NEW.updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_issue_metrics_trigger
BEFORE UPDATE ON mottivme_intelligence_system.issues
FOR EACH ROW
EXECUTE FUNCTION mottivme_intelligence_system.update_issue_metrics();

-- 6. Função para auto-criar issue quando alerta crítico é criado
CREATE OR REPLACE FUNCTION mottivme_intelligence_system.auto_create_issue_from_alert()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o alerta é crítico ou high, criar issue automaticamente
  IF NEW.severity IN ('critical', 'high') THEN
    INSERT INTO mottivme_intelligence_system.issues (
      alert_id,
      issue_type,
      priority,
      status
    ) VALUES (
      NEW.id,
      NEW.alert_type,
      CASE
        WHEN NEW.severity = 'critical' THEN 'critical'
        WHEN NEW.severity = 'high' THEN 'high'
        ELSE 'medium'
      END,
      'open'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_issue_trigger
AFTER INSERT ON mottivme_intelligence_system.alerts
FOR EACH ROW
EXECUTE FUNCTION mottivme_intelligence_system.auto_create_issue_from_alert();

-- 7. Criar VIEWs no schema public para acesso via REST API
CREATE OR REPLACE VIEW public.issues AS
SELECT * FROM mottivme_intelligence_system.issues;

CREATE OR REPLACE VIEW public.issue_actions AS
SELECT * FROM mottivme_intelligence_system.issue_actions;

CREATE OR REPLACE VIEW public.crt_metrics AS
SELECT * FROM mottivme_intelligence_system.crt_metrics;

CREATE OR REPLACE VIEW public.top_issues AS
SELECT * FROM mottivme_intelligence_system.top_issues;

-- 8. Permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.issues TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.issue_actions TO anon, authenticated, service_role;
GRANT SELECT ON public.crt_metrics TO anon, authenticated, service_role;
GRANT SELECT ON public.top_issues TO anon, authenticated, service_role;

-- 9. Triggers para INSERT/UPDATE/DELETE nas views
CREATE OR REPLACE FUNCTION public.issues_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO mottivme_intelligence_system.issues
  VALUES (NEW.*);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER issues_insert_trigger
INSTEAD OF INSERT ON public.issues
FOR EACH ROW EXECUTE FUNCTION public.issues_insert();

CREATE OR REPLACE FUNCTION public.issues_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE mottivme_intelligence_system.issues
  SET
    alert_id = NEW.alert_id,
    issue_type = NEW.issue_type,
    customer_name = NEW.customer_name,
    customer_phone = NEW.customer_phone,
    detected_at = NEW.detected_at,
    first_response_at = NEW.first_response_at,
    resolved_at = NEW.resolved_at,
    status = NEW.status,
    priority = NEW.priority,
    assigned_to = NEW.assigned_to,
    escalated_to = NEW.escalated_to,
    escalated_at = NEW.escalated_at,
    resolution_notes = NEW.resolution_notes,
    customer_satisfaction = NEW.customer_satisfaction,
    time_to_first_response = NEW.time_to_first_response,
    time_to_resolution = NEW.time_to_resolution,
    updated_at = NOW()
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER issues_update_trigger
INSTEAD OF UPDATE ON public.issues
FOR EACH ROW EXECUTE FUNCTION public.issues_update();

CREATE OR REPLACE FUNCTION public.issue_actions_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO mottivme_intelligence_system.issue_actions
  VALUES (NEW.*);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER issue_actions_insert_trigger
INSTEAD OF INSERT ON public.issue_actions
FOR EACH ROW EXECUTE FUNCTION public.issue_actions_insert();

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================
SELECT 'Resolution Tracking System criado com sucesso!' as status;

-- Verificar tabelas criadas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'mottivme_intelligence_system'
AND table_name IN ('issues', 'issue_actions')
ORDER BY table_name;

-- Verificar views criadas
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('issues', 'issue_actions', 'crt_metrics', 'top_issues')
ORDER BY table_name;