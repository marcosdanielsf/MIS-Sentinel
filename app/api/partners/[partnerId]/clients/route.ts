import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client for server-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Types for Partner Clients
interface PartnerClient {
    id: string;
    partner_id: string;
    client_name: string;
    client_email: string;
    client_phone?: string;
    client_company?: string;
    client_document?: string; // CPF/CNPJ
    subscription_plan?: string;
    subscription_value?: number;
    subscription_status: 'active' | 'inactive' | 'cancelled' | 'trial' | 'pending';
    referral_code?: string;
    referral_source?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
    first_payment_date?: string;
    last_payment_date?: string;
    total_paid?: number;
    created_at: string;
    updated_at: string;
}

// GET - List clients for a specific partner
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
            .select('id, name, status')
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
        const search = searchParams.get('search');
        const subscriptionPlan = searchParams.get('subscription_plan');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const sortBy = searchParams.get('sort_by') || 'created_at';
        const sortOrder = searchParams.get('sort_order') || 'desc';

        let query = supabase
            .from('partner_clients')
            .select('*', { count: 'exact' })
            .eq('partner_id', partnerId);

        // Apply filters
        if (status && status !== 'all') {
            query = query.eq('subscription_status', status);
        }

        if (subscriptionPlan && subscriptionPlan !== 'all') {
            query = query.eq('subscription_plan', subscriptionPlan);
        }

        if (search) {
            query = query.or(
                `client_name.ilike.%${search}%,client_email.ilike.%${search}%,client_company.ilike.%${search}%`
            );
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
            console.error('Error fetching partner clients:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        // Calculate summary statistics
        const { data: allClients } = await supabase
            .from('partner_clients')
            .select('subscription_status, subscription_value, total_paid')
            .eq('partner_id', partnerId);

        const summary = {
            total_clients: count || 0,
            active_clients: allClients?.filter(c => c.subscription_status === 'active').length || 0,
            inactive_clients: allClients?.filter(c => c.subscription_status === 'inactive').length || 0,
            total_mrr: allClients?.filter(c => c.subscription_status === 'active')
                .reduce((sum, c) => sum + (c.subscription_value || 0), 0) || 0,
            total_revenue: allClients?.reduce((sum, c) => sum + (c.total_paid || 0), 0) || 0
        };

        return NextResponse.json({
            success: true,
            data,
            summary,
            partner: {
                id: partner.id,
                name: partner.name,
                status: partner.status
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

// POST - Add client to partner or perform actions
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
        // First, verify partner exists and is active
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

        // CREATE CLIENT
        if (actualAction === 'create' || actualAction === 'add_client') {
            const {
                client_name,
                client_email,
                client_phone,
                client_company,
                client_document,
                subscription_plan,
                subscription_value,
                subscription_status,
                referral_code,
                referral_source,
                notes,
                metadata
            } = params;

            // Validation
            if (!client_name || !client_email) {
                return NextResponse.json(
                    { success: false, error: 'client_name and client_email are required' },
                    { status: 400 }
                );
            }

            // Check for duplicate email under same partner
            const { data: existingClient } = await supabase
                .from('partner_clients')
                .select('id')
                .eq('partner_id', partnerId)
                .eq('client_email', client_email.toLowerCase().trim())
                .single();

            if (existingClient) {
                return NextResponse.json(
                    { success: false, error: 'A client with this email already exists for this partner' },
                    { status: 409 }
                );
            }

            const clientData = {
                partner_id: partnerId,
                client_name,
                client_email: client_email.toLowerCase().trim(),
                client_phone: client_phone || null,
                client_company: client_company || null,
                client_document: client_document || null,
                subscription_plan: subscription_plan || null,
                subscription_value: subscription_value || 0,
                subscription_status: subscription_status || 'pending',
                referral_code: referral_code || null,
                referral_source: referral_source || 'partner_referral',
                notes: notes || null,
                metadata: metadata || {},
                total_paid: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('partner_clients')
                .insert(clientData)
                .select()
                .single();

            if (error) {
                console.error('Error creating client:', error);
                return NextResponse.json(
                    { success: false, error: error.message },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                data,
                message: 'Client added to partner successfully'
            }, { status: 201 });
        }

        // UPDATE CLIENT
        if (actualAction === 'update' || actualAction === 'update_client') {
            const { client_id, id, ...updateFields } = params;
            const clientId = client_id || id;

            if (!clientId) {
                return NextResponse.json(
                    { success: false, error: 'client_id is required' },
                    { status: 400 }
                );
            }

            // Verify client belongs to this partner
            const { data: existingClient } = await supabase
                .from('partner_clients')
                .select('id, partner_id')
                .eq('id', clientId)
                .eq('partner_id', partnerId)
                .single();

            if (!existingClient) {
                return NextResponse.json(
                    { success: false, error: 'Client not found for this partner' },
                    { status: 404 }
                );
            }

            // Build update object
            const updates: Record<string, unknown> = {
                updated_at: new Date().toISOString()
            };

            const allowedFields = [
                'client_name', 'client_email', 'client_phone', 'client_company',
                'client_document', 'subscription_plan', 'subscription_value',
                'subscription_status', 'referral_code', 'referral_source',
                'notes', 'metadata', 'first_payment_date', 'last_payment_date', 'total_paid'
            ];

            for (const field of allowedFields) {
                if (updateFields[field] !== undefined) {
                    if (field === 'client_email') {
                        updates[field] = updateFields[field].toLowerCase().trim();
                    } else {
                        updates[field] = updateFields[field];
                    }
                }
            }

            const { data, error } = await supabase
                .from('partner_clients')
                .update(updates)
                .eq('id', clientId)
                .select()
                .single();

            if (error) {
                console.error('Error updating client:', error);
                return NextResponse.json(
                    { success: false, error: error.message },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                data,
                message: 'Client updated successfully'
            });
        }

        // RECORD PAYMENT (and potentially trigger commission)
        if (actualAction === 'record_payment') {
            const { client_id, id, amount, payment_date, description } = params;
            const clientId = client_id || id;

            if (!clientId || !amount) {
                return NextResponse.json(
                    { success: false, error: 'client_id and amount are required' },
                    { status: 400 }
                );
            }

            // Verify client belongs to this partner
            const { data: client } = await supabase
                .from('partner_clients')
                .select('*')
                .eq('id', clientId)
                .eq('partner_id', partnerId)
                .single();

            if (!client) {
                return NextResponse.json(
                    { success: false, error: 'Client not found for this partner' },
                    { status: 404 }
                );
            }

            const paymentDateStr = payment_date || new Date().toISOString();
            const newTotalPaid = (client.total_paid || 0) + amount;

            // Update client with payment info
            const clientUpdates: Record<string, unknown> = {
                total_paid: newTotalPaid,
                last_payment_date: paymentDateStr,
                updated_at: new Date().toISOString()
            };

            if (!client.first_payment_date) {
                clientUpdates.first_payment_date = paymentDateStr;
            }

            // If client was pending, activate them
            if (client.subscription_status === 'pending') {
                clientUpdates.subscription_status = 'active';
            }

            const { data: updatedClient, error: updateError } = await supabase
                .from('partner_clients')
                .update(clientUpdates)
                .eq('id', clientId)
                .select()
                .single();

            if (updateError) {
                console.error('Error updating client payment:', updateError);
                return NextResponse.json(
                    { success: false, error: updateError.message },
                    { status: 500 }
                );
            }

            // Calculate and create commission/earning record
            let commissionAmount = 0;
            if (partner.commission_type === 'percentage') {
                commissionAmount = amount * (partner.commission_rate / 100);
            } else if (partner.commission_type === 'fixed') {
                commissionAmount = partner.commission_rate;
            }

            if (commissionAmount > 0) {
                const earningData = {
                    partner_id: partnerId,
                    client_id: clientId,
                    amount: commissionAmount,
                    original_amount: amount,
                    commission_rate: partner.commission_rate,
                    commission_type: partner.commission_type,
                    status: 'pending',
                    description: description || `Commission for payment from ${client.client_name}`,
                    payment_date: paymentDateStr,
                    created_at: new Date().toISOString()
                };

                await supabase
                    .from('partner_earnings')
                    .insert(earningData);
            }

            return NextResponse.json({
                success: true,
                data: {
                    client: updatedClient,
                    payment: {
                        amount,
                        date: paymentDateStr,
                        commission_generated: commissionAmount
                    }
                },
                message: 'Payment recorded successfully'
            });
        }

        // CANCEL CLIENT SUBSCRIPTION
        if (actualAction === 'cancel' || actualAction === 'cancel_subscription') {
            const { client_id, id, reason } = params;
            const clientId = client_id || id;

            if (!clientId) {
                return NextResponse.json(
                    { success: false, error: 'client_id is required' },
                    { status: 400 }
                );
            }

            // Verify client belongs to this partner
            const { data: client } = await supabase
                .from('partner_clients')
                .select('id, partner_id')
                .eq('id', clientId)
                .eq('partner_id', partnerId)
                .single();

            if (!client) {
                return NextResponse.json(
                    { success: false, error: 'Client not found for this partner' },
                    { status: 404 }
                );
            }

            const { data, error } = await supabase
                .from('partner_clients')
                .update({
                    subscription_status: 'cancelled',
                    updated_at: new Date().toISOString(),
                    metadata: {
                        cancellation_date: new Date().toISOString(),
                        cancellation_reason: reason || 'Not specified'
                    }
                })
                .eq('id', clientId)
                .select()
                .single();

            if (error) {
                console.error('Error cancelling subscription:', error);
                return NextResponse.json(
                    { success: false, error: error.message },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                data,
                message: 'Client subscription cancelled'
            });
        }

        // BULK IMPORT CLIENTS
        if (actualAction === 'bulk_import') {
            const { clients } = params;

            if (!clients || !Array.isArray(clients) || clients.length === 0) {
                return NextResponse.json(
                    { success: false, error: 'clients array is required' },
                    { status: 400 }
                );
            }

            const results = {
                success: 0,
                failed: 0,
                errors: [] as { email: string; error: string }[]
            };

            for (const clientData of clients) {
                if (!clientData.client_name || !clientData.client_email) {
                    results.failed++;
                    results.errors.push({
                        email: clientData.client_email || 'unknown',
                        error: 'client_name and client_email are required'
                    });
                    continue;
                }

                // Check for duplicate
                const { data: existing } = await supabase
                    .from('partner_clients')
                    .select('id')
                    .eq('partner_id', partnerId)
                    .eq('client_email', clientData.client_email.toLowerCase().trim())
                    .single();

                if (existing) {
                    results.failed++;
                    results.errors.push({
                        email: clientData.client_email,
                        error: 'Client already exists'
                    });
                    continue;
                }

                const { error } = await supabase
                    .from('partner_clients')
                    .insert({
                        partner_id: partnerId,
                        client_name: clientData.client_name,
                        client_email: clientData.client_email.toLowerCase().trim(),
                        client_phone: clientData.client_phone || null,
                        client_company: clientData.client_company || null,
                        subscription_plan: clientData.subscription_plan || null,
                        subscription_value: clientData.subscription_value || 0,
                        subscription_status: clientData.subscription_status || 'pending',
                        referral_source: 'bulk_import',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });

                if (error) {
                    results.failed++;
                    results.errors.push({
                        email: clientData.client_email,
                        error: error.message
                    });
                } else {
                    results.success++;
                }
            }

            return NextResponse.json({
                success: true,
                data: results,
                message: `Imported ${results.success} clients, ${results.failed} failed`
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

// DELETE - Remove client from partner
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
        const clientId = searchParams.get('client_id');

        if (!clientId) {
            return NextResponse.json(
                { success: false, error: 'client_id query parameter is required' },
                { status: 400 }
            );
        }

        // Verify client belongs to this partner
        const { data: client } = await supabase
            .from('partner_clients')
            .select('id, partner_id')
            .eq('id', clientId)
            .eq('partner_id', partnerId)
            .single();

        if (!client) {
            return NextResponse.json(
                { success: false, error: 'Client not found for this partner' },
                { status: 404 }
            );
        }

        const { error } = await supabase
            .from('partner_clients')
            .delete()
            .eq('id', clientId);

        if (error) {
            console.error('Error deleting client:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Client removed from partner successfully'
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
