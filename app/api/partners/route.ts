import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client for server-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Types for Partners
interface Partner {
    id: string;
    name: string;
    email: string;
    phone?: string;
    company_name?: string;
    document?: string; // CPF/CNPJ
    status: 'active' | 'inactive' | 'pending' | 'suspended';
    partner_type: 'affiliate' | 'reseller' | 'agency' | 'white_label';
    commission_rate: number; // Percentage (0-100)
    commission_type: 'percentage' | 'fixed' | 'tiered';
    parent_partner_id?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zip_code?: string;
        country?: string;
    };
    bank_info?: {
        bank_name?: string;
        account_type?: string;
        account_number?: string;
        routing_number?: string;
        pix_key?: string;
    };
    metadata?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

// GET - List partners with filters
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;

    // Filter parameters
    const status = searchParams.get('status');
    const partnerType = searchParams.get('partner_type');
    const search = searchParams.get('search');
    const parentPartnerId = searchParams.get('parent_partner_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortOrder = searchParams.get('sort_order') || 'desc';

    try {
        let query = supabase
            .from('partners')
            .select('*', { count: 'exact' });

        // Apply filters
        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        if (partnerType && partnerType !== 'all') {
            query = query.eq('partner_type', partnerType);
        }

        if (parentPartnerId) {
            query = query.eq('parent_partner_id', parentPartnerId);
        }

        if (search) {
            query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%`);
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
            console.error('Error fetching partners:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data,
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

// POST - Create or update partner (action-based)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, ...params } = body;

        if (!action) {
            return NextResponse.json(
                { success: false, error: 'Action is required' },
                { status: 400 }
            );
        }

        // CREATE PARTNER
        if (action === 'create' || action === 'add_partner') {
            const {
                name,
                email,
                phone,
                company_name,
                document,
                partner_type,
                commission_rate,
                commission_type,
                parent_partner_id,
                address,
                bank_info,
                metadata
            } = params;

            // Validation
            if (!name || !email) {
                return NextResponse.json(
                    { success: false, error: 'name and email are required' },
                    { status: 400 }
                );
            }

            // Check for duplicate email
            const { data: existingPartner } = await supabase
                .from('partners')
                .select('id')
                .eq('email', email)
                .single();

            if (existingPartner) {
                return NextResponse.json(
                    { success: false, error: 'A partner with this email already exists' },
                    { status: 409 }
                );
            }

            const partnerData = {
                name,
                email: email.toLowerCase().trim(),
                phone: phone || null,
                company_name: company_name || null,
                document: document || null,
                status: 'pending' as const,
                partner_type: partner_type || 'affiliate',
                commission_rate: commission_rate ?? 10, // Default 10%
                commission_type: commission_type || 'percentage',
                parent_partner_id: parent_partner_id || null,
                address: address || null,
                bank_info: bank_info || null,
                metadata: metadata || {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('partners')
                .insert(partnerData)
                .select()
                .single();

            if (error) {
                console.error('Error creating partner:', error);
                return NextResponse.json(
                    { success: false, error: error.message },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                data,
                message: 'Partner created successfully'
            }, { status: 201 });
        }

        // UPDATE PARTNER (via POST for action-based)
        if (action === 'update' || action === 'update_partner') {
            const { partner_id, id, ...updateFields } = params;
            const partnerId = partner_id || id;

            if (!partnerId) {
                return NextResponse.json(
                    { success: false, error: 'partner_id is required' },
                    { status: 400 }
                );
            }

            // Check if partner exists
            const { data: existingPartner } = await supabase
                .from('partners')
                .select('id')
                .eq('id', partnerId)
                .single();

            if (!existingPartner) {
                return NextResponse.json(
                    { success: false, error: 'Partner not found' },
                    { status: 404 }
                );
            }

            // Build update object with only provided fields
            const updates: Record<string, unknown> = {
                updated_at: new Date().toISOString()
            };

            const allowedFields = [
                'name', 'email', 'phone', 'company_name', 'document',
                'status', 'partner_type', 'commission_rate', 'commission_type',
                'parent_partner_id', 'address', 'bank_info', 'metadata'
            ];

            for (const field of allowedFields) {
                if (updateFields[field] !== undefined) {
                    updates[field] = updateFields[field];
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
        }

        // ACTIVATE PARTNER
        if (action === 'activate') {
            const { partner_id, id } = params;
            const partnerId = partner_id || id;

            if (!partnerId) {
                return NextResponse.json(
                    { success: false, error: 'partner_id is required' },
                    { status: 400 }
                );
            }

            const { data, error } = await supabase
                .from('partners')
                .update({
                    status: 'active',
                    updated_at: new Date().toISOString()
                })
                .eq('id', partnerId)
                .select()
                .single();

            if (error) {
                console.error('Error activating partner:', error);
                return NextResponse.json(
                    { success: false, error: error.message },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                data,
                message: 'Partner activated successfully'
            });
        }

        // SUSPEND PARTNER
        if (action === 'suspend') {
            const { partner_id, id, reason } = params;
            const partnerId = partner_id || id;

            if (!partnerId) {
                return NextResponse.json(
                    { success: false, error: 'partner_id is required' },
                    { status: 400 }
                );
            }

            const { data, error } = await supabase
                .from('partners')
                .update({
                    status: 'suspended',
                    metadata: supabase.rpc('jsonb_set_lax', {
                        target: 'metadata',
                        path: '{suspension_reason}',
                        new_value: JSON.stringify(reason || 'No reason provided')
                    }),
                    updated_at: new Date().toISOString()
                })
                .eq('id', partnerId)
                .select()
                .single();

            if (error) {
                // Fallback without metadata update
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('partners')
                    .update({
                        status: 'suspended',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', partnerId)
                    .select()
                    .single();

                if (fallbackError) {
                    console.error('Error suspending partner:', fallbackError);
                    return NextResponse.json(
                        { success: false, error: fallbackError.message },
                        { status: 500 }
                    );
                }

                return NextResponse.json({
                    success: true,
                    data: fallbackData,
                    message: 'Partner suspended successfully'
                });
            }

            return NextResponse.json({
                success: true,
                data,
                message: 'Partner suspended successfully'
            });
        }

        // BULK UPDATE STATUS
        if (action === 'bulk_update_status') {
            const { partner_ids, status } = params;

            if (!partner_ids || !Array.isArray(partner_ids) || partner_ids.length === 0) {
                return NextResponse.json(
                    { success: false, error: 'partner_ids array is required' },
                    { status: 400 }
                );
            }

            if (!status || !['active', 'inactive', 'pending', 'suspended'].includes(status)) {
                return NextResponse.json(
                    { success: false, error: 'Valid status is required (active, inactive, pending, suspended)' },
                    { status: 400 }
                );
            }

            const { data, error } = await supabase
                .from('partners')
                .update({
                    status,
                    updated_at: new Date().toISOString()
                })
                .in('id', partner_ids)
                .select();

            if (error) {
                console.error('Error bulk updating partners:', error);
                return NextResponse.json(
                    { success: false, error: error.message },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                data,
                message: `${data?.length || 0} partners updated successfully`
            });
        }

        // GET PARTNER STATS
        if (action === 'stats') {
            const { data: stats, error } = await supabase
                .from('partners')
                .select('status, partner_type');

            if (error) {
                console.error('Error fetching partner stats:', error);
                return NextResponse.json(
                    { success: false, error: error.message },
                    { status: 500 }
                );
            }

            const statusCount = stats?.reduce((acc, p) => {
                acc[p.status] = (acc[p.status] || 0) + 1;
                return acc;
            }, {} as Record<string, number>) || {};

            const typeCount = stats?.reduce((acc, p) => {
                acc[p.partner_type] = (acc[p.partner_type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>) || {};

            return NextResponse.json({
                success: true,
                data: {
                    total: stats?.length || 0,
                    by_status: statusCount,
                    by_type: typeCount
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
