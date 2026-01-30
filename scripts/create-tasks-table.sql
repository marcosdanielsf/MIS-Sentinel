-- TASKS TABLE FOR MIS SENTINEL
-- Task management with time metrics for performance tracking

-- Create tasks table in public schema
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Project reference
    project_key TEXT NOT NULL,

    -- Task details
    title TEXT NOT NULL,
    description TEXT,

    -- Status and priority
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('urgent', 'high', 'medium', 'low')),

    -- Time metrics for performance tracking
    started_at TIMESTAMPTZ,           -- When task was started (moved to in_progress)
    completed_at TIMESTAMPTZ,         -- When task was completed
    due_date TIMESTAMPTZ,             -- Optional deadline
    estimated_hours DECIMAL(5,2),     -- Estimated hours to complete
    actual_hours DECIMAL(5,2),        -- Actual hours spent

    -- Calculated fields (updated by trigger)
    time_to_start_minutes INTEGER,    -- Minutes from creation to start
    time_to_complete_minutes INTEGER, -- Minutes from start to completion
    total_duration_minutes INTEGER,   -- Minutes from creation to completion

    -- Assignment
    assigned_to TEXT,
    assigned_at TIMESTAMPTZ,

    -- Notes and metadata
    notes TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create projects table if not exists (for reference)
CREATE TABLE IF NOT EXISTS public.projects (
    project_key TEXT PRIMARY KEY,
    project_name TEXT NOT NULL,
    description TEXT,
    current_status TEXT DEFAULT 'active' CHECK (current_status IN ('active', 'planning', 'paused', 'completed', 'archived')),
    current_phase TEXT DEFAULT 'development',
    current_focus TEXT,
    tech_stack TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default projects if not exists
INSERT INTO public.projects (project_key, project_name, current_status, current_phase, tech_stack)
VALUES
    ('assembly-line', 'Assembly Line SaaS', 'active', 'development', ARRAY['Next.js 14', 'TypeScript', 'Supabase', 'Airtable', 'n8n', 'Stripe']),
    ('socialfy', 'Socialfy CRM', 'active', 'development', ARRAY['GoHighLevel', 'n8n', 'Supabase']),
    ('motive-squad', 'MOTIVE SQUAD', 'active', 'development', ARRAY['n8n', 'Supabase', 'WhatsApp']),
    ('segundo-cerebro', 'Segundo Cerebro MOTTIVME', 'planning', 'design', ARRAY['Monday.com', 'n8n', 'Supabase', 'pgvector']),
    ('context-loader', 'Context Loader', 'planning', 'design', ARRAY['Monday.com', 'n8n', 'Supabase']),
    ('mottivme-geral', 'MOTTIVME Geral', 'active', 'production', ARRAY['n8n', 'GoHighLevel', 'Supabase']),
    ('bposs-white-label', 'BPOSS White Label', 'planning', 'design', ARRAY['Next.js', 'Supabase', 'GoHighLevel', 'Stripe'])
ON CONFLICT (project_key) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_project_key ON public.tasks(project_key);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);

-- Function to calculate time metrics
CREATE OR REPLACE FUNCTION calculate_task_time_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate time_to_start_minutes (creation to start)
    IF NEW.started_at IS NOT NULL THEN
        NEW.time_to_start_minutes := EXTRACT(EPOCH FROM (NEW.started_at - NEW.created_at)) / 60;
    END IF;

    -- Calculate time_to_complete_minutes (start to completion)
    IF NEW.completed_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
        NEW.time_to_complete_minutes := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) / 60;
    END IF;

    -- Calculate total_duration_minutes (creation to completion)
    IF NEW.completed_at IS NOT NULL THEN
        NEW.total_duration_minutes := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.created_at)) / 60;
    END IF;

    -- Update updated_at
    NEW.updated_at := NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for time metrics calculation
DROP TRIGGER IF EXISTS trigger_calculate_task_time_metrics ON public.tasks;
CREATE TRIGGER trigger_calculate_task_time_metrics
    BEFORE INSERT OR UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION calculate_task_time_metrics();

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access (since MIS uses anon key)
CREATE POLICY "Allow anonymous read tasks" ON public.tasks
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert tasks" ON public.tasks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update tasks" ON public.tasks
    FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous read projects" ON public.projects
    FOR SELECT USING (true);

-- Grant permissions
GRANT ALL ON public.tasks TO anon;
GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.projects TO anon;
GRANT ALL ON public.projects TO authenticated;

-- View for task summaries by project
CREATE OR REPLACE VIEW public.task_summaries AS
SELECT
    p.project_key,
    p.project_name,
    COUNT(*) FILTER (WHERE t.status = 'pending') AS pending,
    COUNT(*) FILTER (WHERE t.status = 'in_progress') AS in_progress,
    COUNT(*) FILTER (WHERE t.status = 'completed') AS completed,
    COUNT(*) FILTER (WHERE t.status = 'blocked') AS blocked,
    COUNT(*) FILTER (WHERE t.status = 'cancelled') AS cancelled,
    COUNT(*) AS total,
    AVG(t.time_to_complete_minutes) FILTER (WHERE t.status = 'completed') AS avg_completion_time_minutes,
    AVG(t.actual_hours) FILTER (WHERE t.actual_hours IS NOT NULL) AS avg_actual_hours
FROM public.projects p
LEFT JOIN public.tasks t ON p.project_key = t.project_key
GROUP BY p.project_key, p.project_name;

GRANT SELECT ON public.task_summaries TO anon;
GRANT SELECT ON public.task_summaries TO authenticated;
