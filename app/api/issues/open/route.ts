import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { searchParams } = new URL(request.url);
        const priority = searchParams.get('priority'); // Filter by priority
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
            console.error('Error fetching issues:', error);
            return NextResponse.json(
                { error: 'Failed to fetch issues', details: error.message },
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
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}