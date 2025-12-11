-- ============================================================================
-- FIX: Adicionar DEFAULT gen_random_uuid() nas tabelas
-- ============================================================================

-- Alterar tabela issues para gerar UUID automaticamente
ALTER TABLE mottivme_intelligence_system.issues
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Alterar tabela issue_actions para gerar UUID automaticamente
ALTER TABLE mottivme_intelligence_system.issue_actions
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Verificar se funcionou
SELECT
  table_name,
  column_name,
  column_default
FROM information_schema.columns
WHERE table_schema = 'mottivme_intelligence_system'
AND table_name IN ('issues', 'issue_actions')
AND column_name = 'id';