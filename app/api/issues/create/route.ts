import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
    try {
        // Using public schema - custom schema needs to be exposed in Supabase API settings
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const body = await request.json();

        const {
            alert_id,
            issue_type,
            customer_name,
            customer_phone,
            priority = 'medium',
            message_id,
        } = body;

        // Validate required fields
        if (!issue_type) {
            return NextResponse.json(
                { error: 'issue_type is required' },
                { status: 400 }
            );
        }

        // Create issue using RPC function
        const { data: issue, error: issueError } = await supabase.rpc('create_issue', {
            p_alert_id: alert_id || null,
            p_issue_type: issue_type,
            p_customer_name: customer_name || null,
            p_customer_phone: customer_phone || null,
            p_priority: priority,
            p_metadata: body.metadata || null,
        });

        if (issueError) {
            console.error('Error creating issue:', issueError);
            return NextResponse.json(
                { error: 'Failed to create issue', details: issueError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            issue,
            message: 'Issue created successfully',
        });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}