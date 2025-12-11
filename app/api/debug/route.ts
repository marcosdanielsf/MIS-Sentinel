import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    return NextResponse.json({
        hasUrl: !!supabaseUrl,
        urlPrefix: supabaseUrl?.substring(0, 30) || 'NOT_SET',
        hasServiceKey: !!serviceKey,
        serviceKeyPrefix: serviceKey?.substring(0, 20) || 'NOT_SET',
        nodeEnv: process.env.NODE_ENV,
    });
}
