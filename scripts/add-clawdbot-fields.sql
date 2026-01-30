-- CLAWDBOT INTEGRATION FIELDS
-- Migration to add Clawdbot-specific columns to tasks table

-- Add Clawdbot fields to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS clawdbot_session_id TEXT,
ADD COLUMN IF NOT EXISTS clawdbot_context TEXT,
ADD COLUMN IF NOT EXISTS clawdbot_summary TEXT,
ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'web';

-- Create index for Clawdbot session lookups
CREATE INDEX IF NOT EXISTS idx_tasks_clawdbot_session 
ON public.tasks(clawdbot_session_id) 
WHERE clawdbot_session_id IS NOT NULL;

-- Create index for created_by field
CREATE INDEX IF NOT EXISTS idx_tasks_created_by 
ON public.tasks(created_by);

-- Add comments for documentation
COMMENT ON COLUMN public.tasks.clawdbot_session_id IS 'Session ID from Clawdbot for tracking conversations';
COMMENT ON COLUMN public.tasks.clawdbot_context IS 'Context from Clawdbot (e.g., "Marcos asked to...")';
COMMENT ON COLUMN public.tasks.clawdbot_summary IS 'Summary of what Clawdbot did to complete the task';
COMMENT ON COLUMN public.tasks.created_by IS 'Source of task creation: web, clawdbot, api, n8n';

-- ============================================================================
-- AUDIT LOGS TABLE (Optional - for tracking Clawdbot API calls)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.clawdbot_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source TEXT NOT NULL DEFAULT 'clawdbot',
    action TEXT NOT NULL,
    session_id TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_clawdbot_audit_timestamp 
ON public.clawdbot_audit_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_clawdbot_audit_action 
ON public.clawdbot_audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_clawdbot_audit_session 
ON public.clawdbot_audit_logs(session_id) 
WHERE session_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.clawdbot_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies (restrict to service role for security)
CREATE POLICY "Service role full access to audit logs" 
ON public.clawdbot_audit_logs
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.clawdbot_audit_logs TO service_role;
GRANT INSERT ON public.clawdbot_audit_logs TO anon;
GRANT INSERT ON public.clawdbot_audit_logs TO authenticated;

-- Add comment
COMMENT ON TABLE public.clawdbot_audit_logs IS 'Audit trail for Clawdbot API interactions';

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Run this to verify the migration worked:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'tasks' 
-- AND column_name LIKE 'clawdbot%' OR column_name = 'created_by';
