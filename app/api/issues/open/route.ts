import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering to avoid static generation errors
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
    try {
        // Check if env vars are available
        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json(
                { error: 'Missing environment variables', hasUrl: !!supabaseUrl, hasKey: !!supabaseServiceKey },
                { status: 500 }
            );
        }

        // Using public schema - custom schema needs to be exposed in Supabase API settings
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { searchParams } = new URL(request.url);
        const priority = searchParams.get('priority');
        const limit = searchParams.get('limit') || '50';

        let query = supabase
            .from('issues')
            .select('*')
            .in('status', ['open', 'in_progress', 'escalated'])
            .order('detected_at', { ascending: false })
            .limit(parseInt(limit));

        if (priority) {
            query = query.eq('priority', priority);
        }

        const { data: issues, error } = await query;

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.json(
                {
                    error: 'Failed to fetch issues',
                    details: error.message,
                    code: error.code,
                    hint: error.hint
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            count: issues?.length || 0,
            issues: issues || [],
        });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message, stack: error.stack },
            { status: 500 }
        );
    }
}