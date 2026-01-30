import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// =============================================================================
// Supabase Client
// =============================================================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =============================================================================
// Rate Limiting (In-Memory - resets on restart)
// =============================================================================
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 100; // requests per window
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const record = rateLimitMap.get(key);

    if (!record || now > record.resetAt) {
        rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
    }

    if (record.count >= RATE_LIMIT_MAX) {
        return { allowed: false, remaining: 0 };
    }

    record.count++;
    return { allowed: true, remaining: RATE_LIMIT_MAX - record.count };
}

// =============================================================================
// Authentication
// =============================================================================
function authenticateRequest(request: NextRequest): { valid: boolean; error?: string } {
    const apiKey = request.headers.get('X-Clawdbot-Key');
    const expectedKey = process.env.CLAWDBOT_API_KEY;

    if (!expectedKey) {
        console.error('[Clawdbot API] CLAWDBOT_API_KEY not configured in environment');
        return { valid: false, error: 'API not configured' };
    }

    if (!apiKey) {
        return { valid: false, error: 'Missing X-Clawdbot-Key header' };
    }

    if (apiKey !== expectedKey) {
        return { valid: false, error: 'Invalid API key' };
    }

    return { valid: true };
}

// =============================================================================
// Audit Logging
// =============================================================================
async function logAudit(action: string, details: Record<string, unknown>, sessionId?: string) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        source: 'clawdbot',
        action,
        session_id: sessionId || null,
        details,
    };

    // Log to console (can be extended to store in DB or external service)
    console.log('[Clawdbot Audit]', JSON.stringify(logEntry));

    // Optionally store in Supabase (if audit table exists)
    try {
        const { error } = await supabase
            .from('clawdbot_audit_logs')
            .insert(logEntry);
        
        if (error && !error.message.includes('does not exist')) {
            console.warn('[Clawdbot Audit] Failed to store audit log:', error.message);
        }
    } catch {
        // Table might not exist, that's fine
    }
}

// =============================================================================
// Validation Schemas (Zod)
// =============================================================================
const priorityEnum = z.enum(['critical', 'high', 'medium', 'low']);
const statusEnum = z.enum(['pending', 'in_progress', 'completed', 'blocked', 'cancelled']);

const createTaskSchema = z.object({
    action: z.literal('create'),
    project_key: z.string().min(1, 'project_key is required'),
    title: z.string().min(1, 'title is required').max(500),
    description: z.string().max(5000).optional(),
    priority: priorityEnum.default('medium'),
    due_date: z.string().datetime().optional(),
    estimated_hours: z.number().positive().optional(),
    assigned_to: z.string().optional(),
    // Clawdbot-specific fields
    clawdbot_session_id: z.string().optional(),
    clawdbot_context: z.string().max(2000).optional(),
});

const updateTaskSchema = z.object({
    action: z.literal('update'),
    task_id: z.string().uuid('task_id must be a valid UUID'),
    status: statusEnum.optional(),
    priority: priorityEnum.optional(),
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    notes: z.string().max(2000).optional(),
    actual_hours: z.number().positive().optional(),
    assigned_to: z.string().optional(),
    // Clawdbot-specific fields
    clawdbot_session_id: z.string().optional(),
    clawdbot_summary: z.string().max(2000).optional(),
});

const listTasksSchema = z.object({
    status: statusEnum.optional(),
    project_key: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    clawdbot_session_id: z.string().optional(),
});

// =============================================================================
// GET - List tasks with optional filters
// =============================================================================
export async function GET(request: NextRequest) {
    // Check rate limit
    const clientId = request.headers.get('X-Clawdbot-Key') || 'anonymous';
    const rateLimit = checkRateLimit(clientId);
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { success: false, error: 'Rate limit exceeded. Try again later.' },
            { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
        );
    }

    // Authenticate
    const auth = authenticateRequest(request);
    if (!auth.valid) {
        await logAudit('auth_failed', { error: auth.error });
        return NextResponse.json(
            { success: false, error: auth.error },
            { status: 401 }
        );
    }

    try {
        // Parse query params
        const searchParams = request.nextUrl.searchParams;
        const params = {
            status: searchParams.get('status') || undefined,
            project_key: searchParams.get('project_key') || undefined,
            limit: searchParams.get('limit') || '50',
            offset: searchParams.get('offset') || '0',
            clawdbot_session_id: searchParams.get('clawdbot_session_id') || undefined,
        };

        const validation = listTasksSchema.safeParse(params);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'Invalid parameters', details: validation.error.flatten() },
                { status: 400 }
            );
        }

        const { status, project_key, limit, offset, clawdbot_session_id } = validation.data;

        // Build query
        let query = supabase
            .from('tasks')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) {
            query = query.eq('status', status);
        }

        if (project_key) {
            query = query.eq('project_key', project_key);
        }

        if (clawdbot_session_id) {
            query = query.eq('clawdbot_session_id', clawdbot_session_id);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('[Clawdbot API] Database error:', error);
            return NextResponse.json(
                { success: false, error: 'Database error' },
                { status: 500 }
            );
        }

        await logAudit('list_tasks', { 
            filters: { status, project_key, clawdbot_session_id },
            result_count: data?.length || 0 
        });

        return NextResponse.json({
            success: true,
            data,
            meta: {
                total: count,
                limit,
                offset,
            },
        }, {
            headers: { 'X-RateLimit-Remaining': String(rateLimit.remaining) }
        });

    } catch (error) {
        console.error('[Clawdbot API] Unexpected error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// =============================================================================
// POST - Create or Update tasks
// =============================================================================
export async function POST(request: NextRequest) {
    // Check rate limit
    const clientId = request.headers.get('X-Clawdbot-Key') || 'anonymous';
    const rateLimit = checkRateLimit(clientId);
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { success: false, error: 'Rate limit exceeded. Try again later.' },
            { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
        );
    }

    // Authenticate
    const auth = authenticateRequest(request);
    if (!auth.valid) {
        await logAudit('auth_failed', { error: auth.error });
        return NextResponse.json(
            { success: false, error: auth.error },
            { status: 401 }
        );
    }

    try {
        const body = await request.json();
        const action = body.action;

        // =================================================================
        // CREATE TASK
        // =================================================================
        if (action === 'create') {
            const validation = createTaskSchema.safeParse(body);
            if (!validation.success) {
                return NextResponse.json(
                    { success: false, error: 'Validation failed', details: validation.error.flatten() },
                    { status: 400 }
                );
            }

            const {
                project_key,
                title,
                description,
                priority,
                due_date,
                estimated_hours,
                assigned_to,
                clawdbot_session_id,
                clawdbot_context,
            } = validation.data;

            // Verify project exists
            const { data: project, error: projectError } = await supabase
                .from('projects')
                .select('project_key')
                .eq('project_key', project_key)
                .single();

            if (projectError || !project) {
                return NextResponse.json(
                    { success: false, error: `Project '${project_key}' not found` },
                    { status: 404 }
                );
            }

            // Insert task
            const { data, error } = await supabase
                .from('tasks')
                .insert({
                    project_key,
                    title,
                    description: description || null,
                    priority,
                    status: 'pending',
                    due_date: due_date || null,
                    estimated_hours: estimated_hours || null,
                    assigned_to: assigned_to || null,
                    clawdbot_session_id: clawdbot_session_id || null,
                    clawdbot_context: clawdbot_context || null,
                    created_by: 'clawdbot',
                })
                .select()
                .single();

            if (error) {
                console.error('[Clawdbot API] Insert error:', error);
                return NextResponse.json(
                    { success: false, error: 'Failed to create task' },
                    { status: 500 }
                );
            }

            await logAudit('create_task', { 
                task_id: data.id, 
                project_key, 
                title,
            }, clawdbot_session_id);

            return NextResponse.json({
                success: true,
                data,
                message: 'Task created successfully',
            }, {
                status: 201,
                headers: { 'X-RateLimit-Remaining': String(rateLimit.remaining) }
            });
        }

        // =================================================================
        // UPDATE TASK
        // =================================================================
        if (action === 'update') {
            const validation = updateTaskSchema.safeParse(body);
            if (!validation.success) {
                return NextResponse.json(
                    { success: false, error: 'Validation failed', details: validation.error.flatten() },
                    { status: 400 }
                );
            }

            const {
                task_id,
                status,
                priority,
                title,
                description,
                notes,
                actual_hours,
                assigned_to,
                clawdbot_session_id,
                clawdbot_summary,
            } = validation.data;

            // Build update object
            const updates: Record<string, unknown> = {
                updated_at: new Date().toISOString(),
            };

            if (status !== undefined) {
                updates.status = status;
                if (status === 'in_progress' && !updates.started_at) {
                    updates.started_at = new Date().toISOString();
                }
                if (status === 'completed') {
                    updates.completed_at = new Date().toISOString();
                }
            }

            if (priority !== undefined) updates.priority = priority;
            if (title !== undefined) updates.title = title;
            if (description !== undefined) updates.description = description;
            if (notes !== undefined) updates.notes = notes;
            if (actual_hours !== undefined) updates.actual_hours = actual_hours;
            if (assigned_to !== undefined) updates.assigned_to = assigned_to;
            if (clawdbot_session_id !== undefined) updates.clawdbot_session_id = clawdbot_session_id;
            if (clawdbot_summary !== undefined) updates.clawdbot_summary = clawdbot_summary;

            // Update task
            const { data, error } = await supabase
                .from('tasks')
                .update(updates)
                .eq('id', task_id)
                .select()
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return NextResponse.json(
                        { success: false, error: `Task '${task_id}' not found` },
                        { status: 404 }
                    );
                }
                console.error('[Clawdbot API] Update error:', error);
                return NextResponse.json(
                    { success: false, error: 'Failed to update task' },
                    { status: 500 }
                );
            }

            await logAudit('update_task', { 
                task_id, 
                updates: Object.keys(updates),
            }, clawdbot_session_id);

            return NextResponse.json({
                success: true,
                data,
                message: 'Task updated successfully',
            }, {
                headers: { 'X-RateLimit-Remaining': String(rateLimit.remaining) }
            });
        }

        // =================================================================
        // UNKNOWN ACTION
        // =================================================================
        return NextResponse.json(
            { success: false, error: `Unknown action: ${action}. Valid actions: create, update` },
            { status: 400 }
        );

    } catch (error) {
        if (error instanceof SyntaxError) {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON body' },
                { status: 400 }
            );
        }
        console.error('[Clawdbot API] Unexpected error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
