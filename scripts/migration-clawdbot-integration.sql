-- ============================================================
-- Migration: Clawdbot Integration
-- Data: 2025-02-01
-- Descrição: Adiciona suporte à integração com Clawdbot AI
-- ============================================================

-- ============================================================
-- 1. NOVAS COLUNAS NA TABELA TASKS
-- ============================================================

-- Session ID do Clawdbot para rastreamento de conversas
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS clawdbot_session_id TEXT;

-- Contexto da conversa (JSON) para continuidade
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS clawdbot_context TEXT;

-- Resumo gerado pelo Clawdbot
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS clawdbot_summary TEXT;

-- Origem da task (manual, clawdbot, n8n, api)
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' 
CHECK (source IN ('manual', 'clawdbot', 'n8n', 'api'));

-- Posição para ordenação dentro do kanban
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- ============================================================
-- 2. ÍNDICES PARA PERFORMANCE
-- ============================================================

-- Índice para busca por sessão Clawdbot
CREATE INDEX IF NOT EXISTS idx_tasks_clawdbot_session 
ON public.tasks(clawdbot_session_id);

-- Índice para filtrar por origem
CREATE INDEX IF NOT EXISTS idx_tasks_source 
ON public.tasks(source);

-- Índice composto para ordenação no kanban
CREATE INDEX IF NOT EXISTS idx_tasks_position 
ON public.tasks(project_key, status, position);

-- ============================================================
-- 3. VIEW PARA TAREFAS CLAWDBOT
-- ============================================================

CREATE OR REPLACE VIEW public.clawdbot_tasks AS
SELECT 
    id,
    project_key,
    title,
    description,
    status,
    priority,
    clawdbot_session_id,
    clawdbot_context,
    clawdbot_summary,
    source,
    position,
    created_at,
    started_at,
    completed_at
FROM public.tasks
WHERE source = 'clawdbot' 
   OR clawdbot_session_id IS NOT NULL;

-- ============================================================
-- 4. PROJETO CLAWDBOT NA TABELA PROJECTS
-- ============================================================

INSERT INTO public.projects (project_key, project_name, current_status, current_phase)
VALUES ('clawdbot-tasks', 'Tarefas Clawdbot', 'active', 'production')
ON CONFLICT (project_key) DO NOTHING;

-- ============================================================
-- 5. GRANT PERMISSIONS (RLS)
-- ============================================================

-- Permitir acesso à view via anon/authenticated
GRANT SELECT ON public.clawdbot_tasks TO anon, authenticated;

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================

-- Para reverter (ROLLBACK):
-- DROP VIEW IF EXISTS public.clawdbot_tasks;
-- DROP INDEX IF EXISTS idx_tasks_clawdbot_session;
-- DROP INDEX IF EXISTS idx_tasks_source;
-- DROP INDEX IF EXISTS idx_tasks_position;
-- ALTER TABLE public.tasks DROP COLUMN IF EXISTS clawdbot_session_id;
-- ALTER TABLE public.tasks DROP COLUMN IF EXISTS clawdbot_context;
-- ALTER TABLE public.tasks DROP COLUMN IF EXISTS clawdbot_summary;
-- ALTER TABLE public.tasks DROP COLUMN IF EXISTS source;
-- ALTER TABLE public.tasks DROP COLUMN IF EXISTS position;
-- DELETE FROM public.projects WHERE project_key = 'clawdbot-tasks';
