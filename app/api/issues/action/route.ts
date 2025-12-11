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
            issue_id,
            action_type,
            action_description,
            taken_by = 'SYSTEM_AUTO',
            success = true,
            customer_response,
        } = body;

        // Validate required fields
        if (!issue_id || !action_type || !action_description) {
            return NextResponse.json(
                { error: 'issue_id, action_type, and action_description are required' },
                { status: 400 }
            );
        }

        // Add action using RPC function (automatically updates first_response_at)
        const { data: action, error: actionError } = await supabase.rpc('add_issue_action', {
            p_issue_id: issue_id,
            p_action_type: action_type,
            p_action_description: action_description,
            p_taken_by: taken_by,
            p_success: success,
            p_customer_response: customer_response || null,
        });

        if (actionError) {
            console.error('Error creating action:', actionError);
            return NextResponse.json(
                { error: 'Failed to create action', details: actionError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            action,
            message: 'Action added successfully',
        });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}