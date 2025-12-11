-- ============================================================================
-- FIX: Permissões para Service Role acessar tabelas CRT
-- ============================================================================

-- Garantir que service_role tem acesso total às tabelas
GRANT ALL ON mottivme_intelligence_system.issues TO service_role;
GRANT ALL ON mottivme_intelligence_system.issue_actions TO service_role;

-- Garantir acesso às views
GRANT ALL ON public.issues TO anon, authenticated, service_role;
GRANT ALL ON public.issue_actions TO anon, authenticated, service_role;
GRANT SELECT ON public.crt_metrics TO anon, authenticated, service_role;
GRANT SELECT ON public.top_issues TO anon, authenticated, service_role;

-- Garantir que as sequences (para UUIDs) também têm permissão
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA mottivme_intelligence_system TO service_role;

-- Verificar permissões
SELECT
  schemaname,
  tablename,
  tableowner,
  has_table_privilege('service_role', schemaname||'.'||tablename, 'INSERT') as can_insert,
  has_table_privilege('service_role', schemaname||'.'||tablename, 'SELECT') as can_select,
  has_table_privilege('service_role', schemaname||'.'||tablename, 'UPDATE') as can_update
FROM pg_tables
WHERE schemaname = 'mottivme_intelligence_system'
AND tablename IN ('issues', 'issue_actions');