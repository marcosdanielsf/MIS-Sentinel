import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client for server-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Types for Partner Earnings
interface PartnerEarning {
    id: string;
    partner_id: string;
    client_id?: string;
    amount: number;
    original_amount?: number;
    commission_rate?: number;
    commission_type?: 'percentage' | 'fixed' | 'tiered';
    status: 'pending' | 'approved' | 'paid' | 'cancelled' | 'on_hold';
    description?: string;
    payment_date?: string;
    paid_date?: string;
    payment_method?: string;
    payment_reference?: string;
    metadata?: Record<string, unknown>;
    created_at: string;
    updated_at?: string;
}

// GET - List earnings for a specific partner
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ partnerId: string }> }
) {
    const { partnerId } = await params;

    if (!partnerId) {
        return NextResponse.json(
            { success: false, error: 'Partner ID is required' },
            { status: 400 }
        );
    }

    try {
        // First, verify partner exists
        const { data: partner, error: partnerError } = await supabase
            .from('partners')
            .select('id, name, status, commission_rate, commission_type')
            .eq('id', partnerId)
            .single();

        if (partnerError || !partner) {
            return NextResponse.json(
                { success: false, error: 'Partner not found' },
                { status: 404 }
            );
        }

        const searchParams = request.nextUrl.searchParams;

        // Filter parameters
        const status = searchParams.get('status');
        const dateFrom = searchParams.get('date_from');
        const dateTo = searchParams.get('date_to');
        const clientId = searchParams.get('client_id');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const sortBy = searchParams.get('sort_by') || 'created_at';
        const sortOrder = searchParams.get('sort_order') || 'desc';
        const summary = searchParams.get('summary') === 'true';

        // If only summary is requested
        if (summary) {
            const { data: allEarnings } = await supabase
                .from('partner_earnings')
                .select('amount, status, created_at')
                .eq('partner_id', partnerId);

            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            const summaryData = {
                total_earnings: allEarnings?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0,
                pending_amount: allEarnings?.filter(e => e.status === 'pending')
                    .reduce((sum, e) => sum + (e.amount || 0), 0) || 0,
                approved_amount: allEarnings?.filter(e => e.status === 'approved')
                    .reduce((sum, e) => sum + (e.amount || 0), 0) || 0,
                paid_amount: allEarnings?.filter(e => e.status === 'paid')
                    .reduce((sum, e) => sum + (e.amount || 0), 0) || 0,
                on_hold_amount: allEarnings?.filter(e => e.status === 'on_hold')
                    .reduce((sum, e) => sum + (e.amount || 0), 0) || 0,
                cancelled_amount: allEarnings?.filter(e => e.status === 'cancelled')
                    .reduce((sum, e) => sum + (e.amount || 0), 0) || 0,
                this_month: allEarnings?.filter(e => {
                    const d = new Date(e.created_at);
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                }).reduce((sum, e) => sum + (e.amount || 0), 0) || 0,
                total_transactions: allEarnings?.length || 0,
                pending_transactions: allEarnings?.filter(e => e.status === 'pending').length || 0,
                by_status: allEarnings?.reduce((acc, e) => {
                    acc[e.status] = (acc[e.status] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>) || {}
            };

            return NextResponse.json({
                success: true,
                data: summaryData,
                partner: {
                    id: partner.id,
                    name: partner.name,
                    commission_rate: partner.commission_rate,
                    commission_type: partner.commission_type
                }
            });
        }

        // Build query for earnings list
        let query = supabase
            .from('partner_earnings')
            .select('*', { count: 'exact' })
            .eq('partner_id', partnerId);

        // Apply filters
        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        if (clientId) {
            query = query.eq('client_id', clientId);
        }

        if (dateFrom) {
            query = query.gte('created_at', dateFrom);
        }

        if (dateTo) {
            query = query.lte('created_at', dateTo);
        }

        // Apply sorting
        const ascending = sortOrder === 'asc';
        query = query.order(sortBy, { ascending });

        // Apply pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) {
            console.error('Error fetching partner earnings:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        // Get totals for current filter
        let totalsQuery = supabase
            .from('partner_earnings')
            .select('amount, status')
            .eq('partner_id', partnerId);

        if (status && status !== 'all') {
            totalsQuery = totalsQuery.eq('status', status);
        }
        if (clientId) {
            totalsQuery = totalsQuery.eq('client_id', clientId);
        }
        if (dateFrom) {
            totalsQuery = totalsQuery.gte('created_at', dateFrom);
        }
        if (dateTo) {
            totalsQuery = totalsQuery.lte('created_at', dateTo);
        }

        const { data: filteredEarnings } = await totalsQuery;

        const totals = {
            total_amount: filteredEarnings?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0,
            pending: filteredEarnings?.filter(e => e.status === 'pending')
                .reduce((sum, e) => sum + (e.amount || 0), 0) || 0,
            paid: filteredEarnings?.filter(e => e.status === 'paid')
                .reduce((sum, e) => sum + (e.amount || 0), 0) || 0
        };

        return NextResponse.json({
            success: true,
            data,
            totals,
            partner: {
                id: partner.id,
                name: partner.name,
                status: partner.status,
                commission_rate: partner.commission_rate,
                commission_type: partner.commission_type
            },
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: count ? Math.ceil(count / limit) : 0
            }
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST - Create earning or perform actions on earnings
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ partnerId: string }> }
) {
    const { partnerId } = await params;

    if (!partnerId) {
        return NextResponse.json(
            { success: false, error: 'Partner ID is required' },
            { status: 400 }
        );
    }

    try {
        // First, verify partner exists
        const { data: partner, error: partnerError } = await supabase
            .from('partners')
            .select('id, name, status, commission_rate, commission_type')
            .eq('id', partnerId)
            .single();

        if (partnerError || !partner) {
            return NextResponse.json(
                { success: false, error: 'Partner not found' },
                { status: 404 }
            );
        }

        const body = await request.json();
        const { action, ...params } = body;

        // If no action specified, treat as create
        const actualAction = action || 'create';

        // CREATE EARNING RECORD (manual commission/bonus)
        if (actualAction === 'create' || actualAction === 'add_earning') {
            const {
                amount,
                client_id,
                original_amount,
                commission_rate,
                commission_type,
                description,
                payment_date,
                status,
                metadata
            } = params;

            if (!amount || amount <= 0) {
                return NextResponse.json(
                    { success: false, error: 'Valid amount is required' },
                    { status: 400 }
                );
            }

            const earningData = {
                partner_id: partnerId,
                client_id: client_id || null,
                amount,
                original_amount: original_amount || null,
                commission_rate: commission_rate || partner.commission_rate,
                commission_type: commission_type || partner.commission_type,
                status: status || 'pending',
                description: description || 'Manual commission entry',
                payment_date: payment_date || null,
                metadata: metadata || {},
                created_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('partner_earnings')
                .insert(earningData)
                .select()
                .single();

            if (error) {
                console.error('Error creating earning:', error);
                return NextResponse.json(
                    { success: false, error: error.message },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                data,
                message: 'Earning record created successfully'
            }, { status: 201 });
        }

        // APPROVE EARNING
        if (actualAction === 'approve') {
            const { earning_id, id, notes } = params;
            const earningId = earning_id || id;

            if (!earningId) {
                return NextResponse.json(
                    { success: false, error: 'earning_id is required' },
                    { status: 400 }
                );
            }

            // Verify earning belongs to this partner
            const { data: earning } = await supabase
                .from('partner_earnings')
                .select('id, partner_id, status')
                .eq('id', earningId)
                .eq('partner_id', partnerId)
                .single();

            if (!earning) {
                return NextResponse.json(
                    { success: false, error: 'Earning not found for this partner' },
                    { status: 404 }
                );
            }

            if (earning.status !== 'pending') {
                return NextResponse.json(
                    { success: false, error: `Cannot approve earning with status: ${earning.status}` },
                    { status: 400 }
                );
            }

            const { data, error } = await supabase
                .from('partner_earnings')
                .update({
                    status: 'approved',
                    updated_at: new Date().toISOString(),
                    metadata: {
                        approved_at: new Date().toISOString(),
                        approval_notes: notes || null
                    }
                })
                .eq('id', earningId)
                .select()
                .single();

            if (error) {
                console.error('Error approving earning:', error);
                return NextResponse.json(
                    { success: false, error: error.message },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                data,
                message: 'Earning approved successfully'
            });
        }

        // MARK AS PAID
        if (actualAction === 'mark_paid' || actualAction === 'pay') {
            const { earning_id, id, payment_method, payment_reference, paid_date, notes } = params;
            const earningId = earning_id || id;

            if (!earningId) {
                return NextResponse.json(
                    { success: false, error: 'earning_id is required' },
                    { status: 400 }
                );
            }

            // Verify earning belongs to this partner
            const { data: earning } = await supabase
                .from('partner_earnings')
                .select('id, partner_id, status')
                .eq('id', earningId)
                .eq('partner_id', partnerId)
                .single();

            if (!earning) {
                return NextResponse.json(
                    { success: false, error: 'Earning not found for this partner' },
                    { status: 404 }
                );
            }

            if (!['pending', 'approved'].includes(earning.status)) {
                return NextResponse.json(
                    { success: false, error: `Cannot mark as paid earning with status: ${earning.status}` },
                    { status: 400 }
                );
            }

            const { data, error } = await supabase
                .from('partner_earnings')
                .update({
                    status: 'paid',
                    paid_date: paid_date || new Date().toISOString(),
                    payment_method: payment_method || null,
                    payment_reference: payment_reference || null,
                    updated_at: new Date().toISOString(),
                    metadata: {
                        paid_at: new Date().toISOString(),
                        payment_notes: notes || null
                    }
                })
                .eq('id', earningId)
                .select()
                .single();

            if (error) {
                console.error('Error marking earning as paid:', error);
                return NextResponse.json(
                    { success: false, error: error.message },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                data,
                message: 'Earning marked as paid'
            });
        }

        // BULK MARK AS PAID
        if (actualAction === 'bulk_pay') {
            const { earning_ids, payment_method, payment_reference, paid_date } = params;

            if (!earning_ids || !Array.isArray(earning_ids) || earning_ids.length === 0) {
                return NextResponse.json(
                    { success: false, error: 'earning_ids array is required' },
                    { status: 400 }
                );
            }

            // Verify all earnings belong to this partner and are payable
            const { data: earnings } = await supabase
                .from('partner_earnings')
                .select('id, status')
                .eq('partner_id', partnerId)
                .in('id', earning_ids);

            const validIds = earnings?.filter(e => ['pending', 'approved'].includes(e.status))
                .map(e => e.id) || [];

            if (validIds.length === 0) {
                return NextResponse.json(
                    { success: false, error: 'No valid earnings to pay' },
                    { status: 400 }
                );
            }

            const { data, error } = await supabase
                .from('partner_earnings')
                .update({
                    status: 'paid',
                    paid_date: paid_date || new Date().toISOString(),
                    payment_method: payment_method || null,
                    payment_reference: payment_reference || null,
                    updated_at: new Date().toISOString()
                })
                .in('id', validIds)
                .select();

            if (error) {
                console.error('Error bulk paying earnings:', error);
                return NextResponse.json(
                    { success: false, error: error.message },
                    { status: 500 }
                );
            }

            const totalPaid = data?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

            return NextResponse.json({
                success: true,
                data,
                message: `${data?.length || 0} earnings marked as paid, total: ${totalPaid}`
            });
        }

        // CANCEL EARNING
        if (actualAction === 'cancel') {
            const { earning_id, id, reason } = params;
            const earningId = earning_id || id;

            if (!earningId) {
                return NextResponse.json(
                    { success: false, error: 'earning_id is required' },
                    { status: 400 }
                );
            }

            // Verify earning belongs to this partner
            const { data: earning } = await supabase
                .from('partner_earnings')
                .select('id, partner_id, status')
                .eq('id', earningId)
                .eq('partner_id', partnerId)
                .single();

            if (!earning) {
                return NextResponse.json(
                    { success: false, error: 'Earning not found for this partner' },
                    { status: 404 }
                );
            }

            if (earning.status === 'paid') {
                return NextResponse.json(
                    { success: false, error: 'Cannot cancel a paid earning' },
                    { status: 400 }
                );
            }

            const { data, error } = await supabase
                .from('partner_earnings')
                .update({
                    status: 'cancelled',
                    updated_at: new Date().toISOString(),
                    metadata: {
                        cancelled_at: new Date().toISOString(),
                        cancellation_reason: reason || 'No reason provided'
                    }
                })
                .eq('id', earningId)
                .select()
                .single();

            if (error) {
                console.error('Error cancelling earning:', error);
                return NextResponse.json(
                    { success: false, error: error.message },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                data,
                message: 'Earning cancelled successfully'
            });
        }

        // PUT ON HOLD
        if (actualAction === 'hold' || actualAction === 'put_on_hold') {
            const { earning_id, id, reason } = params;
            const earningId = earning_id || id;

            if (!earningId) {
                return NextResponse.json(
                    { success: false, error: 'earning_id is required' },
                    { status: 400 }
                );
            }

            // Verify earning belongs to this partner
            const { data: earning } = await supabase
                .from('partner_earnings')
                .select('id, partner_id, status')
                .eq('id', earningId)
                .eq('partner_id', partnerId)
                .single();

            if (!earning) {
                return NextResponse.json(
                    { success: false, error: 'Earning not found for this partner' },
                    { status: 404 }
                );
            }

            const { data, error } = await supabase
                .from('partner_earnings')
                .update({
                    status: 'on_hold',
                    updated_at: new Date().toISOString(),
                    metadata: {
                        on_hold_at: new Date().toISOString(),
                        hold_reason: reason || 'Under review'
                    }
                })
                .eq('id', earningId)
                .select()
                .single();

            if (error) {
                console.error('Error putting earning on hold:', error);
                return NextResponse.json(
                    { success: false, error: error.message },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                data,
                message: 'Earning put on hold'
            });
        }

        // GET MONTHLY REPORT
        if (actualAction === 'monthly_report') {
            const { year, month } = params;
            const reportYear = year || new Date().getFullYear();
            const reportMonth = month !== undefined ? month : new Date().getMonth();

            const startDate = new Date(reportYear, reportMonth, 1);
            const endDate = new Date(reportYear, reportMonth + 1, 0, 23, 59, 59);

            const { data: monthlyEarnings } = await supabase
                .from('partner_earnings')
                .select('*')
                .eq('partner_id', partnerId)
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString())
                .order('created_at', { ascending: true });

            const report = {
                period: {
                    year: reportYear,
                    month: reportMonth + 1,
                    start_date: startDate.toISOString(),
                    end_date: endDate.toISOString()
                },
                summary: {
                    total_transactions: monthlyEarnings?.length || 0,
                    total_amount: monthlyEarnings?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0,
                    pending: monthlyEarnings?.filter(e => e.status === 'pending')
                        .reduce((sum, e) => sum + (e.amount || 0), 0) || 0,
                    approved: monthlyEarnings?.filter(e => e.status === 'approved')
                        .reduce((sum, e) => sum + (e.amount || 0), 0) || 0,
                    paid: monthlyEarnings?.filter(e => e.status === 'paid')
                        .reduce((sum, e) => sum + (e.amount || 0), 0) || 0,
                    cancelled: monthlyEarnings?.filter(e => e.status === 'cancelled')
                        .reduce((sum, e) => sum + (e.amount || 0), 0) || 0
                },
                by_day: monthlyEarnings?.reduce((acc, e) => {
                    const day = new Date(e.created_at).getDate().toString();
                    if (!acc[day]) {
                        acc[day] = { count: 0, amount: 0 };
                    }
                    acc[day].count++;
                    acc[day].amount += e.amount || 0;
                    return acc;
                }, {} as Record<string, { count: number; amount: number }>) || {},
                transactions: monthlyEarnings
            };

            return NextResponse.json({
                success: true,
                data: report,
                partner: {
                    id: partner.id,
                    name: partner.name
                }
            });
        }

        return NextResponse.json(
            { success: false, error: 'Invalid action' },
            { status: 400 }
        );

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
