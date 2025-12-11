-- ============================================================================
-- CRIAR FUNÇÕES RPC PARA MANIPULAR ISSUES
-- ============================================================================

-- Função para criar issue
CREATE OR REPLACE FUNCTION create_issue(
  p_alert_id UUID DEFAULT NULL,
  p_issue_type VARCHAR DEFAULT NULL,
  p_customer_name VARCHAR DEFAULT NULL,
  p_customer_phone VARCHAR DEFAULT NULL,
  p_priority VARCHAR DEFAULT 'medium',
  p_metadata JSONB DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  alert_id UUID,
  issue_type VARCHAR,
  customer_name VARCHAR,
  customer_phone VARCHAR,
  detected_at TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  status VARCHAR,
  priority VARCHAR,
  assigned_to VARCHAR,
  escalated_to VARCHAR,
  escalated_at TIMESTAMPTZ,
  resolution_notes TEXT,
  customer_satisfaction INTEGER,
  time_to_first_response INTEGER,
  time_to_resolution INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO mottivme_intelligence_system.issues (
    alert_id,
    issue_type,
    customer_name,
    customer_phone,
    priority,
    status,
    metadata
  ) VALUES (
    p_alert_id,
    p_issue_type,
    p_customer_name,
    p_customer_phone,
    p_priority,
    'open',
    p_metadata
  )
  RETURNING *;
END;
$$;

-- Função para adicionar ação a um issue
CREATE OR REPLACE FUNCTION add_issue_action(
  p_issue_id UUID,
  p_action_type VARCHAR,
  p_action_description TEXT,
  p_taken_by VARCHAR DEFAULT 'SYSTEM_AUTO',
  p_success BOOLEAN DEFAULT TRUE,
  p_customer_response TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  issue_id UUID,
  action_type VARCHAR,
  action_description TEXT,
  taken_by VARCHAR,
  taken_at TIMESTAMPTZ,
  success BOOLEAN,
  customer_response TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO mottivme_intelligence_system.issue_actions (
    issue_id,
    action_type,
    action_description,
    taken_by,
    success,
    customer_response
  ) VALUES (
    p_issue_id,
    p_action_type,
    p_action_description,
    p_taken_by,
    p_success,
    p_customer_response
  )
  RETURNING *;
END;
$$;

-- Função para resolver issue
CREATE OR REPLACE FUNCTION resolve_issue(
  p_issue_id UUID,
  p_resolution_notes TEXT,
  p_customer_satisfaction INTEGER DEFAULT NULL,
  p_resolved_by VARCHAR DEFAULT 'SYSTEM_AUTO'
)
RETURNS TABLE (
  id UUID,
  status VARCHAR,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  customer_satisfaction INTEGER,
  time_to_resolution INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE mottivme_intelligence_system.issues
  SET
    status = 'resolved',
    resolved_at = NOW(),
    resolution_notes = p_resolution_notes,
    customer_satisfaction = p_customer_satisfaction,
    updated_at = NOW()
  WHERE id = p_issue_id;

  RETURN QUERY
  SELECT
    issues.id,
    issues.status,
    issues.resolved_at,
    issues.resolution_notes,
    issues.customer_satisfaction,
    issues.time_to_resolution
  FROM mottivme_intelligence_system.issues
  WHERE issues.id = p_issue_id;
END;
$$;

-- Garantir permissões para executar as funções
GRANT EXECUTE ON FUNCTION create_issue TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION add_issue_action TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION resolve_issue TO anon, authenticated, service_role;

-- Testar função
SELECT * FROM create_issue(
  p_issue_type := 'test_function',
  p_customer_name := 'Test User',
  p_priority := 'medium'
);