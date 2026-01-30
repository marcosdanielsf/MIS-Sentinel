import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { dispatchTaskEvent, isDueSoon, isOverdue, type TaskEvent, type TaskEventType } from './webhook/route';

// Create Supabase client for server-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper to trigger webhook events (fire and forget)
async function triggerWebhook(event: TaskEventType, task: Record<string, unknown>, triggeredBy: 'user' | 'system' = 'user') {
  try {
    await dispatchTaskEvent({
      event,
      task: task as TaskEvent['task'],
      timestamp: new Date().toISOString(),
      triggered_by: triggeredBy,
    });
  } catch (error) {
    // Log but don't fail the main operation
    console.error('[Tasks] Webhook dispatch failed:', error);
  }
}

// GET - List tasks and projects
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'list_tasks';
    const projectKey = searchParams.get('project_key') || undefined;
    const status = searchParams.get('status') || undefined;

    try {
        if (action === 'list_projects') {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .order('project_name');

            if (error) {
                console.error('Error fetching projects:', error);
                return NextResponse.json({ success: false, error: error.message });
            }

            return NextResponse.json({ success: true, data, count: data?.length || 0 });
        }

        if (action === 'project_summary' || action === 'task_summaries') {
            // Try to use the view first
            const { data: summaries, error: summaryError } = await supabase
                .from('task_summaries')
                .select('*');

            if (!summaryError && summaries) {
                return NextResponse.json({ success: true, data: summaries });
            }

            // Fallback: calculate summaries manually
            const { data: projects, error: projectsError } = await supabase
                .from('projects')
                .select('project_key, project_name');

            if (projectsError) {
                return NextResponse.json({ success: false, error: projectsError.message });
            }

            const summaryData = [];
            for (const project of projects || []) {
                const { data: tasks } = await supabase
                    .from('tasks')
                    .select('status, time_to_complete_minutes, actual_hours')
                    .eq('project_key', project.project_key);

                const taskList = tasks || [];
                summaryData.push({
                    project_key: project.project_key,
                    project_name: project.project_name,
                    pending: taskList.filter(t => t.status === 'pending').length,
                    in_progress: taskList.filter(t => t.status === 'in_progress').length,
                    completed: taskList.filter(t => t.status === 'completed').length,
                    blocked: taskList.filter(t => t.status === 'blocked').length,
                    total: taskList.length,
                    avg_completion_time_minutes: taskList
                        .filter(t => t.status === 'completed' && t.time_to_complete_minutes)
                        .reduce((sum, t, _, arr) => sum + (t.time_to_complete_minutes || 0) / arr.length, 0) || null
                });
            }

            return NextResponse.json({ success: true, data: summaryData });
        }

        if (action === 'list_tasks') {
            let query = supabase
                .from('tasks')
                .select('*')
                .order('priority', { ascending: true })
                .order('created_at', { ascending: false });

            if (projectKey) {
                query = query.eq('project_key', projectKey);
            }

            if (status && status !== 'all') {
                query = query.eq('status', status);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching tasks:', error);
                return NextResponse.json({ success: false, error: error.message });
            }

            return NextResponse.json({ success: true, data, count: data?.length || 0 });
        }

        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create or update tasks
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, ...params } = body;

        if (!action) {
            return NextResponse.json({ success: false, error: 'Action is required' }, { status: 400 });
        }

        if (action === 'add_task' || action === 'create') {
            const { project_key, title, description, priority, due_date, estimated_hours, assigned_to } = params;

            if (!project_key || !title) {
                return NextResponse.json({ success: false, error: 'project_key and title are required' }, { status: 400 });
            }

            const { data, error } = await supabase
                .from('tasks')
                .insert({
                    project_key,
                    title,
                    description: description || null,
                    priority: priority || 'medium',
                    status: 'pending',
                    due_date: due_date || null,
                    estimated_hours: estimated_hours || null,
                    assigned_to: assigned_to || null,
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating task:', error);
                return NextResponse.json({ success: false, error: error.message });
            }

            // Dispatch task.created webhook
            if (data) {
                triggerWebhook('task.created', data, 'user');
                
                // Check if due soon
                if (isDueSoon(data.due_date)) {
                    triggerWebhook('task.due_soon', data, 'system');
                }
            }

            return NextResponse.json({ success: true, data });
        }

        if (action === 'update_task' || action === 'update') {
            const { task_id, id, status, priority, notes, assigned_to, actual_hours } = params;
            const taskId = task_id || id;

            if (!taskId) {
                return NextResponse.json({ success: false, error: 'task_id is required' }, { status: 400 });
            }

            const updates: Record<string, unknown> = {};

            if (status) {
                updates.status = status;

                // Auto-set timestamps based on status
                if (status === 'in_progress') {
                    updates.started_at = new Date().toISOString();
                } else if (status === 'completed') {
                    updates.completed_at = new Date().toISOString();
                }
            }

            if (priority) updates.priority = priority;
            if (notes !== undefined) updates.notes = notes;
            if (assigned_to !== undefined) updates.assigned_to = assigned_to;
            if (actual_hours !== undefined) updates.actual_hours = actual_hours;

            const { data, error } = await supabase
                .from('tasks')
                .update(updates)
                .eq('id', taskId)
                .select()
                .single();

            if (error) {
                console.error('Error updating task:', error);
                return NextResponse.json({ success: false, error: error.message });
            }

            // Dispatch webhooks based on status changes
            if (data) {
                if (status === 'blocked') {
                    triggerWebhook('task.blocked', data, 'user');
                } else if (status === 'completed') {
                    triggerWebhook('task.completed', data, 'user');
                } else if (status) {
                    triggerWebhook('task.status_changed', data, 'user');
                }
                
                // Check for overdue
                if (isOverdue(data.due_date, data.status)) {
                    triggerWebhook('task.overdue', data, 'system');
                }
            }

            return NextResponse.json({ success: true, data });
        }

        if (action === 'complete_task') {
            const { task_id, id, actual_hours, notes } = params;
            const taskId = task_id || id;

            if (!taskId) {
                return NextResponse.json({ success: false, error: 'task_id is required' }, { status: 400 });
            }

            const updates: Record<string, unknown> = {
                status: 'completed',
                completed_at: new Date().toISOString(),
            };

            if (actual_hours) updates.actual_hours = actual_hours;
            if (notes) updates.notes = notes;

            const { data, error } = await supabase
                .from('tasks')
                .update(updates)
                .eq('id', taskId)
                .select()
                .single();

            if (error) {
                console.error('Error completing task:', error);
                return NextResponse.json({ success: false, error: error.message });
            }

            // Dispatch task.completed webhook
            if (data) {
                triggerWebhook('task.completed', data, 'user');
            }

            return NextResponse.json({ success: true, data });
        }

        if (action === 'delete_task' || action === 'delete') {
            const { task_id, id } = params;
            const taskId = task_id || id;

            if (!taskId) {
                return NextResponse.json({ success: false, error: 'task_id is required' }, { status: 400 });
            }

            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', taskId);

            if (error) {
                console.error('Error deleting task:', error);
                return NextResponse.json({ success: false, error: error.message });
            }

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
