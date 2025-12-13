-- ============================================================================
-- FIX ISSUES TABLE - Corrigir schema da tabela issues
-- Problema: Tabela foi criada com campos errados (title, category, resolution_time_hours)
-- Solução: Recriar com campos corretos (issue_type, customer_phone, time_to_resolution)
-- ============================================================================

-- 1. Backup dos dados existentes (se houver)
CREATE TABLE IF NOT EXISTS mottivme_intelligence_system.issues_backup AS
SELECT * FROM mottivme_intelligence_system.issues;

-- 2. Drop da tabela antiga
DROP TABLE IF EXISTS mottivme_intelligence_system.issues CASCADE;

-- 3. Recriar tabela com schema correto (compatível com N8N/API)
CREATE TABLE mottivme_intelligence_system.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relacionamento com alerta
  alert_id UUID REFERENCES mottivme_intelligence_system.alerts(id) ON DELETE SET NULL,

  -- Tipo e Classificação
  issue_type VARCHAR(255) NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  -- Status
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'escalated', 'resolved', 'closed')),

  -- Cliente
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),

  -- Atribuição
  assigned_to VARCHAR(255),
  escalated_to VARCHAR(255),
  escalated_at TIMESTAMPTZ,

  -- Datas e Métricas de Tempo
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,

  -- Métricas calculadas (em minutos)
  time_to_first_response INTEGER, -- minutos até primeira resposta
  time_to_resolution INTEGER,     -- minutos até resolução

  -- Resolução
  resolution_notes TEXT,
  customer_satisfaction INTEGER CHECK (customer_satisfaction >= 1 AND customer_satisfaction <= 5),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indexes
CREATE INDEX idx_issues_status ON mottivme_intelligence_system.issues(status);
CREATE INDEX idx_issues_priority ON mottivme_intelligence_system.issues(priority);
CREATE INDEX idx_issues_detected ON mottivme_intelligence_system.issues(detected_at DESC);
CREATE INDEX idx_issues_customer ON mottivme_intelligence_system.issues(customer_name);

-- 5. RLS
ALTER TABLE mottivme_intelligence_system.issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on issues" ON mottivme_intelligence_system.issues FOR ALL USING (true);

-- 6. Issue Actions table (se não existir)
CREATE TABLE IF NOT EXISTS mottivme_intelligence_system.issue_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES mottivme_intelligence_system.issues(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL,
  action_description TEXT,
  taken_by VARCHAR(255) DEFAULT 'SYSTEM_AUTO',
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN DEFAULT TRUE,
  customer_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issue_actions_issue ON mottivme_intelligence_system.issue_actions(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_actions_taken ON mottivme_intelligence_system.issue_actions(taken_at DESC);

ALTER TABLE mottivme_intelligence_system.issue_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access on issue_actions" ON mottivme_intelligence_system.issue_actions;
CREATE POLICY "Allow all access on issue_actions" ON mottivme_intelligence_system.issue_actions FOR ALL USING (true);

-- 7. Trigger para calcular time_to_first_response automaticamente
CREATE OR REPLACE FUNCTION mottivme_intelligence_system.update_issue_first_response()
RETURNS TRIGGER AS $$
BEGIN
  -- Se é a primeira ação neste issue e first_response_at é null
  IF (SELECT first_response_at FROM mottivme_intelligence_system.issues WHERE id = NEW.issue_id) IS NULL THEN
    UPDATE mottivme_intelligence_system.issues
    SET
      first_response_at = NEW.taken_at,
      time_to_first_response = EXTRACT(EPOCH FROM (NEW.taken_at - detected_at)) / 60,
      updated_at = NOW()
    WHERE id = NEW.issue_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_first_response ON mottivme_intelligence_system.issue_actions;
CREATE TRIGGER trigger_update_first_response
  AFTER INSERT ON mottivme_intelligence_system.issue_actions
  FOR EACH ROW
  EXECUTE FUNCTION mottivme_intelligence_system.update_issue_first_response();

-- 8. Trigger para calcular time_to_resolution quando issue é resolvido
CREATE OR REPLACE FUNCTION mottivme_intelligence_system.update_issue_resolution_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' AND NEW.resolved_at IS NOT NULL THEN
    NEW.time_to_resolution = EXTRACT(EPOCH FROM (NEW.resolved_at - NEW.detected_at)) / 60;
  END IF;

  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_resolution_time ON mottivme_intelligence_system.issues;
CREATE TRIGGER trigger_update_resolution_time
  BEFORE UPDATE ON mottivme_intelligence_system.issues
  FOR EACH ROW
  EXECUTE FUNCTION mottivme_intelligence_system.update_issue_resolution_time();

-- 9. View no public schema para acesso via Supabase API
DROP VIEW IF EXISTS public.issues;
CREATE VIEW public.issues AS SELECT * FROM mottivme_intelligence_system.issues;

DROP VIEW IF EXISTS public.issue_actions;
CREATE VIEW public.issue_actions AS SELECT * FROM mottivme_intelligence_system.issue_actions;

-- 10. Grant permissions
GRANT ALL ON mottivme_intelligence_system.issues TO anon, authenticated, service_role;
GRANT ALL ON mottivme_intelligence_system.issue_actions TO anon, authenticated, service_role;
GRANT ALL ON public.issues TO anon, authenticated, service_role;
GRANT ALL ON public.issue_actions TO anon, authenticated, service_role;

-- 11. Verificação
SELECT 'Tabela issues recriada com sucesso!' as status;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'mottivme_intelligence_system'
AND table_name = 'issues'
ORDER BY ordinal_position;
