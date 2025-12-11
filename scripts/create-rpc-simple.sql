-- ============================================================================
-- CRIAR FUNÇÕES RPC PARA MANIPULAR ISSUES (VERSÃO CORRIGIDA)
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
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_new_id UUID;
BEGIN
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
  RETURNING id INTO v_new_id;

  SELECT to_jsonb(issues.*)
  INTO v_result
  FROM mottivme_intelligence_system.issues
  WHERE issues.id = v_new_id;

  RETURN v_result;
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
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_new_action_id UUID;
BEGIN
  -- Inserir ação
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
  RETURNING id INTO v_new_action_id;

  -- Atualizar first_response_at se for a primeira ação
  UPDATE mottivme_intelligence_system.issues
  SET first_response_at = COALESCE(first_response_at, NOW())
  WHERE id = p_issue_id;

  -- Retornar a ação criada
  SELECT to_jsonb(issue_actions.*)
  INTO v_result
  FROM mottivme_intelligence_system.issue_actions
  WHERE issue_actions.id = v_new_action_id;

  RETURN v_result;
END;
$$;

-- Função para resolver issue
CREATE OR REPLACE FUNCTION resolve_issue(
  p_issue_id UUID,
  p_resolution_notes TEXT,
  p_customer_satisfaction INTEGER DEFAULT NULL,
  p_resolved_by VARCHAR DEFAULT 'SYSTEM_AUTO'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE mottivme_intelligence_system.issues
  SET
    status = 'resolved',
    resolved_at = NOW(),
    resolution_notes = p_resolution_notes,
    customer_satisfaction = p_customer_satisfaction,
    updated_at = NOW()
  WHERE id = p_issue_id;

  SELECT to_jsonb(issues.*)
  INTO v_result
  FROM mottivme_intelligence_system.issues
  WHERE issues.id = p_issue_id;

  RETURN v_result;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION create_issue TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION add_issue_action TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION resolve_issue TO anon, authenticated, service_role;

-- Testar
SELECT create_issue(
  p_issue_type := 'test_function',
  p_customer_name := 'Test User',
  p_priority := 'medium'
);