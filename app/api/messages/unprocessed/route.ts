import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: messages, error } = await supabase
            .from('messages')
            .select(`
        id,
        created_at,
        sender_name,
        sender_phone,
        sender_type,
        message_body,
        sentiment,
        urgency_score,
        needs_attention,
        keywords,
        is_group_message,
        group_type,
        group_name,
        group_sender_phone,
        group_sender_name,
        team_analysis,
        workflow_name,
        location_name
      `)
            .eq('processed_by_observer', false)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        // Análise estatística
        const highUrgency = messages?.filter(m => (m.urgency_score || 0) >= 7) || [];
        const needsAttention = messages?.filter(m => m.needs_attention) || [];
        const groupMessages = messages?.filter(m => m.is_group_message) || [];

        return NextResponse.json({
            success: true,
            total: messages?.length || 0,
            stats: {
                high_urgency: highUrgency.length,
                needs_attention: needsAttention.length,
                group_messages: groupMessages.length,
            },
            messages: messages || [],
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}