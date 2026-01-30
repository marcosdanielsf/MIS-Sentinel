import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  createConnectAccount,
  createAccountLink,
  getConnectAccount,
  deleteConnectAccount,
  mapStripeAccountStatus
} from '@/lib/stripe';
import {
  PartnerTier,
  COMMISSION_RATES,
  StripeAccountStatus,
  PartnerStripeAccount
} from '@/types/stripe';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/stripe/connect
 * Create a new Stripe Connect account for a partner
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      partner_id,
      email,
      tier = PartnerTier.STARTER,
      country = 'BR',
      business_type = 'individual',
      refresh_url,
      return_url
    } = body;

    // Validate required fields
    if (!partner_id || !email) {
      return NextResponse.json(
        { error: 'partner_id and email are required' },
        { status: 400 }
      );
    }

    if (!refresh_url || !return_url) {
      return NextResponse.json(
        { error: 'refresh_url and return_url are required' },
        { status: 400 }
      );
    }

    // Check if partner already has a Stripe account
    const { data: existingAccount } = await supabase
      .from('partner_stripe_accounts')
      .select('*')
      .eq('partner_id', partner_id)
      .single();

    if (existingAccount) {
      return NextResponse.json(
        { error: 'Partner already has a Stripe account' },
        { status: 409 }
      );
    }

    // Create Stripe Connect account
    const stripeAccount = await createConnectAccount({
      partner_id,
      email,
      country,
      business_type,
      metadata: {
        tier,
        commission_rate: COMMISSION_RATES[tier as PartnerTier].toString()
      }
    });

    // Save to database
    const partnerAccount: Omit<PartnerStripeAccount, 'id' | 'created_at' | 'updated_at'> = {
      partner_id,
      stripe_account_id: stripeAccount.id,
      stripe_account_status: mapStripeAccountStatus(stripeAccount),
      tier: tier as PartnerTier,
      commission_rate: COMMISSION_RATES[tier as PartnerTier],
      onboarding_completed: false,
      details_submitted: stripeAccount.details_submitted || false,
      charges_enabled: stripeAccount.charges_enabled || false,
      payouts_enabled: stripeAccount.payouts_enabled || false,
      country: stripeAccount.country || country,
      currency: stripeAccount.default_currency || 'brl',
      business_type: stripeAccount.business_type || undefined,
      email: stripeAccount.email || email,
      total_earnings: 0,
      pending_balance: 0,
      available_balance: 0,
      metadata: {
        stripe_created: stripeAccount.created
      }
    };

    const { data: dbAccount, error: dbError } = await supabase
      .from('partner_stripe_accounts')
      .insert(partnerAccount)
      .select()
      .single();

    if (dbError) {
      console.error('Error saving partner account to database:', dbError);
      // Rollback: delete Stripe account
      await deleteConnectAccount(stripeAccount.id);
      return NextResponse.json(
        { error: 'Failed to save partner account' },
        { status: 500 }
      );
    }

    // Create account link for onboarding
    const accountLink = await createAccountLink({
      account_id: stripeAccount.id,
      refresh_url,
      return_url,
      type: 'account_onboarding'
    });

    return NextResponse.json({
      success: true,
      data: {
        account: dbAccount,
        onboarding_url: accountLink.url,
        expires_at: accountLink.expires_at
      }
    });
  } catch (error: any) {
    console.error('Error creating Stripe Connect account:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message || 'Failed to create Stripe Connect account',
          type: error.type || 'internal_error'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/stripe/connect?partner_id=xxx
 * Get partner's Stripe Connect account status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const partner_id = searchParams.get('partner_id');
    const stripe_account_id = searchParams.get('stripe_account_id');

    if (!partner_id && !stripe_account_id) {
      return NextResponse.json(
        { error: 'partner_id or stripe_account_id is required' },
        { status: 400 }
      );
    }

    // Get from database
    let query = supabase.from('partner_stripe_accounts').select('*');

    if (partner_id) {
      query = query.eq('partner_id', partner_id);
    } else if (stripe_account_id) {
      query = query.eq('stripe_account_id', stripe_account_id);
    }

    const { data: dbAccount, error: dbError } = await query.single();

    if (dbError || !dbAccount) {
      return NextResponse.json(
        { error: 'Partner account not found' },
        { status: 404 }
      );
    }

    // Get latest status from Stripe
    const stripeAccount = await getConnectAccount(dbAccount.stripe_account_id);
    const currentStatus = mapStripeAccountStatus(stripeAccount);

    // Update database if status changed
    if (currentStatus !== dbAccount.stripe_account_status) {
      const { data: updatedAccount } = await supabase
        .from('partner_stripe_accounts')
        .update({
          stripe_account_status: currentStatus,
          details_submitted: stripeAccount.details_submitted || false,
          charges_enabled: stripeAccount.charges_enabled || false,
          payouts_enabled: stripeAccount.payouts_enabled || false,
          onboarding_completed: stripeAccount.charges_enabled && stripeAccount.payouts_enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', dbAccount.id)
        .select()
        .single();

      return NextResponse.json({
        success: true,
        data: {
          account: updatedAccount,
          stripe_details: {
            charges_enabled: stripeAccount.charges_enabled,
            payouts_enabled: stripeAccount.payouts_enabled,
            details_submitted: stripeAccount.details_submitted,
            requirements: stripeAccount.requirements
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        account: dbAccount,
        stripe_details: {
          charges_enabled: stripeAccount.charges_enabled,
          payouts_enabled: stripeAccount.payouts_enabled,
          details_submitted: stripeAccount.details_submitted,
          requirements: stripeAccount.requirements
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching Stripe Connect account:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message || 'Failed to fetch account',
          type: error.type || 'internal_error'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/stripe/connect
 * Update partner tier or generate new onboarding link
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      partner_id,
      tier,
      refresh_url,
      return_url,
      action = 'update_tier' // 'update_tier' or 'refresh_onboarding'
    } = body;

    if (!partner_id) {
      return NextResponse.json(
        { error: 'partner_id is required' },
        { status: 400 }
      );
    }

    // Get partner account
    const { data: dbAccount, error: dbError } = await supabase
      .from('partner_stripe_accounts')
      .select('*')
      .eq('partner_id', partner_id)
      .single();

    if (dbError || !dbAccount) {
      return NextResponse.json(
        { error: 'Partner account not found' },
        { status: 404 }
      );
    }

    if (action === 'update_tier') {
      // Update tier and commission rate
      if (!tier || !Object.values(PartnerTier).includes(tier)) {
        return NextResponse.json(
          { error: 'Valid tier is required' },
          { status: 400 }
        );
      }

      const new_commission_rate = COMMISSION_RATES[tier as PartnerTier];

      const { data: updatedAccount } = await supabase
        .from('partner_stripe_accounts')
        .update({
          tier,
          commission_rate: new_commission_rate,
          updated_at: new Date().toISOString()
        })
        .eq('id', dbAccount.id)
        .select()
        .single();

      return NextResponse.json({
        success: true,
        data: {
          account: updatedAccount,
          message: `Partner tier updated to ${tier} with ${new_commission_rate * 100}% commission`
        }
      });
    }

    if (action === 'refresh_onboarding') {
      // Generate new onboarding link
      if (!refresh_url || !return_url) {
        return NextResponse.json(
          { error: 'refresh_url and return_url are required' },
          { status: 400 }
        );
      }

      const accountLink = await createAccountLink({
        account_id: dbAccount.stripe_account_id,
        refresh_url,
        return_url,
        type: dbAccount.onboarding_completed ? 'account_update' : 'account_onboarding'
      });

      return NextResponse.json({
        success: true,
        data: {
          onboarding_url: accountLink.url,
          expires_at: accountLink.expires_at,
          type: dbAccount.onboarding_completed ? 'account_update' : 'account_onboarding'
        }
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "update_tier" or "refresh_onboarding"' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error updating Stripe Connect account:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message || 'Failed to update account',
          type: error.type || 'internal_error'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/stripe/connect?partner_id=xxx
 * Delete/deactivate a partner's Stripe Connect account
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const partner_id = searchParams.get('partner_id');

    if (!partner_id) {
      return NextResponse.json(
        { error: 'partner_id is required' },
        { status: 400 }
      );
    }

    // Get partner account
    const { data: dbAccount, error: dbError } = await supabase
      .from('partner_stripe_accounts')
      .select('*')
      .eq('partner_id', partner_id)
      .single();

    if (dbError || !dbAccount) {
      return NextResponse.json(
        { error: 'Partner account not found' },
        { status: 404 }
      );
    }

    // Delete from Stripe
    await deleteConnectAccount(dbAccount.stripe_account_id);

    // Update database (soft delete - mark as inactive)
    await supabase
      .from('partner_stripe_accounts')
      .update({
        stripe_account_status: StripeAccountStatus.INACTIVE,
        updated_at: new Date().toISOString()
      })
      .eq('id', dbAccount.id);

    return NextResponse.json({
      success: true,
      message: 'Partner Stripe account deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting Stripe Connect account:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message || 'Failed to delete account',
          type: error.type || 'internal_error'
        }
      },
      { status: 500 }
    );
  }
}
