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
            resolution_notes,
            customer_satisfaction = 5,
            resolved_by = 'SYSTEM_AUTO',
        } = body;

        // Validate required fields
        if (!issue_id) {
            return NextResponse.json(
                { error: 'issue_id is required' },
                { status: 400 }
            );
        }

        // Resolve issue using RPC function
        const { data: issue, error: resolveError } = await supabase.rpc('resolve_issue', {
            p_issue_id: issue_id,
            p_resolution_notes: resolution_notes || 'Issue resolvido',
            p_customer_satisfaction: customer_satisfaction,
            p_resolved_by: resolved_by,
        });

        if (resolveError) {
            console.error('Error resolving issue:', resolveError);
            return NextResponse.json(
                { error: 'Failed to resolve issue', details: resolveError.message },
                { status: 500 }
            );
        }

        // Add resolution action
        await supabase.rpc('add_issue_action', {
            p_issue_id: issue_id,
            p_action_type: 'resolved',
            p_action_description: resolution_notes || 'Issue resolvido automaticamente',
            p_taken_by: resolved_by,
            p_success: true,
            p_customer_response: null,
        });

        return NextResponse.json({
            success: true,
            issue,
            message: 'Issue resolved successfully',
        });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}