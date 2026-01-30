import { NextRequest, NextResponse } from 'next/server';
import { dispatchTaskEvent, TaskEvent } from '@/lib/task-events';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://cliente-a1.mentorfy.io/webhook/mis-task-events';

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
