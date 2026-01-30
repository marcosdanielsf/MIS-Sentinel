import { NextRequest, NextResponse } from 'next/server';

// n8n webhook URL
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://cliente-a1.mentorfy.io/webhook/mis-task-events';

// Event types
export type TaskEventType = 
  | 'task.created'
  | 'task.completed'
  | 'task.blocked'
  | 'task.overdue'
  | 'task.due_soon'
  | 'task.status_changed';

export interface TaskEvent {
  event: TaskEventType;
  task: {
    id: string;
    title: string;
    description?: string;
    project_key: string;
    status: string;
    priority: string;
    due_date?: string;
    assigned_to?: string;
    estimated_hours?: number;
    actual_hours?: number;
    notes?: string;
    created_at?: string;
    completed_at?: string;
  };
  timestamp: string;
  triggered_by: 'clawdbot' | 'user' | 'system';
  metadata?: Record<string, unknown>;
}

// Helper to dispatch event to n8n
export async function dispatchTaskEvent(event: TaskEvent): Promise<boolean> {
  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      console.error(`[TaskWebhook] Failed to dispatch event: ${response.status} ${response.statusText}`);
      return false;
    }

    console.log(`[TaskWebhook] Event dispatched: ${event.event} for task ${event.task.id}`);
    return true;
  } catch (error) {
    console.error('[TaskWebhook] Error dispatching event:', error);
    return false;
  }
}

// Check if task is due soon (within 24 hours)
export function isDueSoon(dueDate: string | undefined): boolean {
  if (!dueDate) return false;
  
  const due = new Date(dueDate);
  const now = new Date();
  const diff = due.getTime() - now.getTime();
  const hours = diff / (1000 * 60 * 60);
  
  return hours > 0 && hours <= 24;
}

// Check if task is overdue
export function isOverdue(dueDate: string | undefined, status: string): boolean {
  if (!dueDate || status === 'completed') return false;
  
  const due = new Date(dueDate);
  const now = new Date();
  
  return now > due;
}

// POST - Receive internal events and forward to n8n
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, task, triggered_by = 'system', metadata } = body;

    if (!event || !task) {
      return NextResponse.json(
        { success: false, error: 'event and task are required' },
        { status: 400 }
      );
    }

    const taskEvent: TaskEvent = {
      event,
      task,
      timestamp: new Date().toISOString(),
      triggered_by,
      metadata,
    };

    const dispatched = await dispatchTaskEvent(taskEvent);

    return NextResponse.json({
      success: dispatched,
      event,
      task_id: task.id,
      dispatched_at: taskEvent.timestamp,
    });
  } catch (error) {
    console.error('[TaskWebhook] API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Health check and info
export async function GET() {
  return NextResponse.json({
    service: 'MIS Sentinel Task Webhook',
    status: 'active',
    n8n_endpoint: N8N_WEBHOOK_URL,
    supported_events: [
      'task.created',
      'task.completed', 
      'task.blocked',
      'task.overdue',
      'task.due_soon',
      'task.status_changed',
    ],
    payload_format: {
      event: 'task.created|task.completed|...',
      task: '{ id, title, project_key, status, priority, ... }',
      timestamp: 'ISO 8601',
      triggered_by: 'clawdbot|user|system',
    },
  });
}
