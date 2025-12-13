-- ============================================================================
-- FIX: Query para buscar issues recentes (7 dias)
-- PROBLEMA: A query original tentava buscar da tabela issue_actions com colunas
-- que não existem (status, severity, priority, customer_id, description)
-- ============================================================================

-- A tabela issue_actions é apenas para registrar AÇÕES tomadas em issues
-- Ela tem estas colunas:
--   id, issue_id, action_type, action_description, taken_by, taken_at, success, customer_response, created_at

-- A tabela issues é que tem as colunas de status, priority, etc:
--   id, alert_id, issue_type, priority, status, customer_name, customer_phone,
--   assigned_to, escalated_to, escalated_at, detected_at, first_response_at,
--   resolved_at, time_to_first_response, time_to_resolution, resolution_notes,
--   customer_satisfaction, metadata, created_at, updated_at

-- ============================================================================
-- QUERY CORRIGIDA para N8N - Buscar Issues Recentes (7 dias)
-- ============================================================================

-- OPÇÃO 1: Buscar apenas da tabela issues (recomendado)
SELECT
  i.id,
  i.issue_type as action_type,  -- para manter compatibilidade com o nome esperado
  i.status,
  i.priority as severity,       -- priority como severity
  i.priority,
  i.detected_at,
  i.resolved_at,
  i.customer_phone as customer_id,  -- ou customer_name
  i.customer_name as description,   -- ou criar uma descrição
  COALESCE(i.resolution_notes, 'Issue: ' || i.issue_type) as description_full
FROM mottivme_intelligence_system.issues i
WHERE i.detected_at >= NOW() - INTERVAL '7 days'
ORDER BY i.detected_at DESC
LIMIT 100;

-- OPÇÃO 2: Buscar issues com suas últimas ações (JOIN)
SELECT
  i.id,
  i.issue_type,
  i.status,
  i.priority,
  i.customer_name,
  i.customer_phone,
  i.detected_at,
  i.resolved_at,
  i.resolution_notes,
  i.assigned_to,
  -- Última ação tomada
  (SELECT action_type FROM mottivme_intelligence_system.issue_actions ia
   WHERE ia.issue_id = i.id ORDER BY taken_at DESC LIMIT 1) as last_action_type,
  (SELECT taken_at FROM mottivme_intelligence_system.issue_actions ia
   WHERE ia.issue_id = i.id ORDER BY taken_at DESC LIMIT 1) as last_action_at
FROM mottivme_intelligence_system.issues i
WHERE i.detected_at >= NOW() - INTERVAL '7 days'
ORDER BY i.detected_at DESC
LIMIT 100;

-- ============================================================================
-- ALTERNATIVA: Se você precisa buscar da issue_actions com dados relacionados
-- ============================================================================

-- Esta query junta issue_actions com issues para ter todos os campos
SELECT
  ia.id,
  ia.action_type,
  i.status,
  i.priority as severity,
  i.priority,
  ia.taken_at as detected_at,  -- usando taken_at como detected_at
  i.resolved_at,
  i.customer_phone as customer_id,
  ia.action_description as description
FROM mottivme_intelligence_system.issue_actions ia
LEFT JOIN mottivme_intelligence_system.issues i ON ia.issue_id = i.id
WHERE ia.taken_at >= NOW() - INTERVAL '7 days'
ORDER BY ia.taken_at DESC
LIMIT 100;

-- ============================================================================
-- VIEW para facilitar queries do N8N (RECOMENDADO)
-- ============================================================================

DROP VIEW IF EXISTS public.recent_issues_7days;
CREATE VIEW public.recent_issues_7days AS
SELECT
  i.id,
  i.issue_type,
  i.status,
  i.priority,
  i.customer_name,
  i.customer_phone,
  i.assigned_to,
  i.detected_at,
  i.resolved_at,
  i.resolution_notes,
  i.time_to_first_response,
  i.time_to_resolution,
  i.customer_satisfaction,
  i.metadata,
  -- Contagem de ações
  (SELECT COUNT(*) FROM mottivme_intelligence_system.issue_actions ia WHERE ia.issue_id = i.id) as actions_count,
  -- Última ação
  (SELECT action_type FROM mottivme_intelligence_system.issue_actions ia
   WHERE ia.issue_id = i.id ORDER BY taken_at DESC LIMIT 1) as last_action_type,
  (SELECT taken_at FROM mottivme_intelligence_system.issue_actions ia
   WHERE ia.issue_id = i.id ORDER BY taken_at DESC LIMIT 1) as last_action_at
FROM mottivme_intelligence_system.issues i
WHERE i.detected_at >= NOW() - INTERVAL '7 days';

GRANT SELECT ON public.recent_issues_7days TO anon, authenticated, service_role;

-- ============================================================================
-- VIEW para issue_actions com dados do issue relacionado
-- ============================================================================

DROP VIEW IF EXISTS public.issue_actions_with_details;
CREATE VIEW public.issue_actions_with_details AS
SELECT
  ia.id,
  ia.issue_id,
  ia.action_type,
  ia.action_description,
  ia.taken_by,
  ia.taken_at,
  ia.success,
  ia.customer_response,
  -- Dados do issue relacionado
  i.status as issue_status,
  i.priority as issue_priority,
  i.issue_type,
  i.customer_name,
  i.customer_phone,
  i.detected_at as issue_detected_at,
  i.resolved_at as issue_resolved_at
FROM mottivme_intelligence_system.issue_actions ia
LEFT JOIN mottivme_intelligence_system.issues i ON ia.issue_id = i.id;

GRANT SELECT ON public.issue_actions_with_details TO anon, authenticated, service_role;

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

SELECT 'Views criadas com sucesso!' as status;

-- Testar a view
SELECT * FROM public.recent_issues_7days LIMIT 5;
