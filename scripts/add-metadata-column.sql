-- ============================================================================
-- ADICIONAR COLUNA METADATA NA TABELA ISSUES
-- ============================================================================

-- Adicionar coluna metadata
ALTER TABLE mottivme_intelligence_system.issues
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Verificar se foi adicionada
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'mottivme_intelligence_system'
AND table_name = 'issues'
AND column_name = 'metadata';