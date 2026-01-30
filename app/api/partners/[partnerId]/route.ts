import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client for server-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Get partner details by ID
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
        const searchParams = request.nextUrl.searchParams;
        const includeClients = searchParams.get('include_clients') === 'true';
        const includeEarnings = searchParams.get('include_earnings') === 'true';
        const includeSubPartners = searchParams.get('include_sub_partners') === 'true';

        // Get partner details
        const { data: partner, error: partnerError } = await supabase
            .from('partners')
            .select('*')
            .eq('id', partnerId)
            .single();

        if (partnerError) {
            if (partnerError.code === 'PGRST116') {
                return NextResponse.json(
                    { success: false, error: 'Partner not found' },
                    { status: 404 }
                );
            }
            console.error('Error fetching partner:', partnerError);
            return NextResponse.json(
                { success: false, error: partnerError.message },
                { status: 500 }
            );
        }

        const result: Record<string, unknown> = { partner };

        // Include clients if requested
        if (includeClients) {
            const { data: clients, error: clientsError } = await supabase
                .from('partner_clients')
                .select('*')
                .eq('partner_id', partnerId)
                .order('created_at', { ascending: false });

            if (!clientsError) {
                result.clients = clients;
                result.clients_count = clients?.length || 0;
            }
        }

        // Include earnings summary if requested
        if (includeEarnings) {
            const { data: earnings, error: earningsError } = await supabase
                .from('partner_earnings')
                .select('*')
                .eq('partner_id', partnerId)
                .order('created_at', { ascending: false })
                .limit(10);

            if (!earningsError) {
                // Calculate totals
                const { data: totals } = await supabase
                    .from('partner_earnings')
                    .select('amount, status')
                    .eq('partner_id', partnerId);

                const earningsSummary = {
                    recent_earnings: earnings,
                    total_earned: totals?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0,
                    pending_amount: totals?.filter(e => e.status === 'pending')
                        .reduce((sum, e) => sum + (e.amount || 0), 0) || 0,
                    paid_amount: totals?.filter(e => e.status === 'paid')
                        .reduce((sum, e) => sum + (e.amount || 0), 0) || 0
                };

                result.earnings = earningsSummary;
            }
        }

        // Include sub-partners if requested (for agencies/white label)
        if (includeSubPartners) {
            const { data: subPartners, error: subPartnersError } = await supabase
                .from('partners')
                .select('id, name, email, status, partner_type, commission_rate, created_at')
                .eq('parent_partner_id', partnerId)
                .order('created_at', { ascending: false });

            if (!subPartnersError) {
                result.sub_partners = subPartners;
                result.sub_partners_count = subPartners?.length || 0;
            }
        }

        return NextResponse.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PUT - Update partner by ID
export async function PUT(
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
        const body = await request.json();

        // Check if partner exists
        const { data: existingPartner, error: checkError } = await supabase
            .from('partners')
            .select('id, email')
            .eq('id', partnerId)
            .single();

        if (checkError || !existingPartner) {
            return NextResponse.json(
                { success: false, error: 'Partner not found' },
                { status: 404 }
            );
        }

        // If email is being updated, check for duplicates
        if (body.email && body.email !== existingPartner.email) {
            const { data: duplicateCheck } = await supabase
                .from('partners')
                .select('id')
                .eq('email', body.email.toLowerCase().trim())
                .neq('id', partnerId)
                .single();

            if (duplicateCheck) {
                return NextResponse.json(
                    { success: false, error: 'A partner with this email already exists' },
                    { status: 409 }
                );
            }
        }

        // Build update object
        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString()
        };

        const allowedFields = [
            'name', 'email', 'phone', 'company_name', 'document',
            'status', 'partner_type', 'commission_rate', 'commission_type',
            'parent_partner_id', 'address', 'bank_info', 'metadata'
        ];

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                if (field === 'email') {
                    updates[field] = body[field].toLowerCase().trim();
                } else {
                    updates[field] = body[field];
                }
            }
        }

        // Validate commission_rate if provided
        if (updates.commission_rate !== undefined) {
            const rate = Number(updates.commission_rate);
            if (isNaN(rate) || rate < 0 || rate > 100) {
                return NextResponse.json(
                    { success: false, error: 'commission_rate must be between 0 and 100' },
                    { status: 400 }
                );
            }
            updates.commission_rate = rate;
        }

        // Validate status if provided
        if (updates.status) {
            const validStatuses = ['active', 'inactive', 'pending', 'suspended'];
            if (!validStatuses.includes(updates.status as string)) {
                return NextResponse.json(
                    { success: false, error: `status must be one of: ${validStatuses.join(', ')}` },
                    { status: 400 }
                );
            }
        }

        // Validate partner_type if provided
        if (updates.partner_type) {
            const validTypes = ['affiliate', 'reseller', 'agency', 'white_label'];
            if (!validTypes.includes(updates.partner_type as string)) {
                return NextResponse.json(
                    { success: false, error: `partner_type must be one of: ${validTypes.join(', ')}` },
                    { status: 400 }
                );
            }
        }

        const { data, error } = await supabase
            .from('partners')
            .update(updates)
            .eq('id', partnerId)
            .select()
            .single();

        if (error) {
            console.error('Error updating partner:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data,
            message: 'Partner updated successfully'
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE - Soft delete (deactivate) partner by ID
export async function DELETE(
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
        const searchParams = request.nextUrl.searchParams;
        const hardDelete = searchParams.get('hard_delete') === 'true';

        // Check if partner exists
        const { data: existingPartner, error: checkError } = await supabase
            .from('partners')
            .select('id, status')
            .eq('id', partnerId)
            .single();

        if (checkError || !existingPartner) {
            return NextResponse.json(
                { success: false, error: 'Partner not found' },
                { status: 404 }
            );
        }

        if (hardDelete) {
            // Check for associated data before hard delete
            const { data: clients } = await supabase
                .from('partner_clients')
                .select('id')
                .eq('partner_id', partnerId)
                .limit(1);

            const { data: earnings } = await supabase
                .from('partner_earnings')
                .select('id')
                .eq('partner_id', partnerId)
                .limit(1);

            const { data: subPartners } = await supabase
                .from('partners')
                .select('id')
                .eq('parent_partner_id', partnerId)
                .limit(1);

            if ((clients && clients.length > 0) ||
                (earnings && earnings.length > 0) ||
                (subPartners && subPartners.length > 0)) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Cannot hard delete partner with associated data. Use soft delete instead.',
                        has_clients: (clients?.length || 0) > 0,
                        has_earnings: (earnings?.length || 0) > 0,
                        has_sub_partners: (subPartners?.length || 0) > 0
                    },
                    { status: 400 }
                );
            }

            // Perform hard delete
            const { error } = await supabase
                .from('partners')
                .delete()
                .eq('id', partnerId);

            if (error) {
                console.error('Error deleting partner:', error);
                return NextResponse.json(
                    { success: false, error: error.message },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                message: 'Partner permanently deleted'
            });
        }

        // Soft delete - set status to inactive
        const { data, error } = await supabase
            .from('partners')
            .update({
                status: 'inactive',
                updated_at: new Date().toISOString(),
                metadata: {
                    ...(existingPartner as any).metadata,
                    deactivated_at: new Date().toISOString()
                }
            })
            .eq('id', partnerId)
            .select()
            .single();

        if (error) {
            console.error('Error deactivating partner:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data,
            message: 'Partner deactivated successfully'
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PATCH - Partial update (same as PUT but more explicit)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ partnerId: string }> }
) {
    // Delegate to PUT handler
    return PUT(request, { params });
}
