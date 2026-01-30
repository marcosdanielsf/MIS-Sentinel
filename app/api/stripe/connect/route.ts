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
      { error: error.message || 'Failed to create Stripe Connect account' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/stripe/connect?partner_id=xxx
 * Get partner's Stripe account info
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const partner_id = searchParams.get('partner_id');

    if (!partner_id) {
      return NextResponse.json(
        { error: 'partner_id is required' },
        { status: 400 }
      );
    }

    // Get from database
    const { data: dbAccount, error: dbError } = await supabase
      .from('partner_stripe_accounts')
      .select('*')
      .eq('partner_id', partner_id)
      .single();

    if (dbError || !dbAccount) {
      return NextResponse.json(
        { error: 'Partner Stripe account not found' },
        { status: 404 }
      );
    }

    // Get fresh data from Stripe
    const stripeAccount = await getConnectAccount(dbAccount.stripe_account_id);

    // Update database with fresh data
    const updates = {
      stripe_account_status: mapStripeAccountStatus(stripeAccount),
      details_submitted: stripeAccount.details_submitted || false,
      charges_enabled: stripeAccount.charges_enabled || false,
      payouts_enabled: stripeAccount.payouts_enabled || false,
      onboarding_completed: stripeAccount.details_submitted && stripeAccount.charges_enabled
    };

    await supabase
      .from('partner_stripe_accounts')
      .update(updates)
      .eq('id', dbAccount.id);

    return NextResponse.json({
      success: true,
      data: {
        ...dbAccount,
        ...updates,
        stripe_details: {
          type: stripeAccount.type,
          country: stripeAccount.country,
          default_currency: stripeAccount.default_currency,
          capabilities: stripeAccount.capabilities,
          requirements: stripeAccount.requirements
        }
      }
    });
  } catch (error: any) {
    console.error('Error getting Stripe account:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get Stripe account' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/stripe/connect?partner_id=xxx
 * Delete partner's Stripe account
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const partner_id = searchParams.get('partner_id');

    if (!partner_id) {
      return NextResponse.json(
        { error: 'partner_id is required' },
        { status: 400 }
      );
    }

    // Get from database
    const { data: dbAccount, error: dbError } = await supabase
      .from('partner_stripe_accounts')
      .select('*')
      .eq('partner_id', partner_id)
      .single();

    if (dbError || !dbAccount) {
      return NextResponse.json(
        { error: 'Partner Stripe account not found' },
        { status: 404 }
      );
    }

    // Delete from Stripe
    await deleteConnectAccount(dbAccount.stripe_account_id);

    // Delete from database
    await supabase
      .from('partner_stripe_accounts')
      .delete()
      .eq('id', dbAccount.id);

    return NextResponse.json({
      success: true,
      message: 'Stripe account deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting Stripe account:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete Stripe account' },
      { status: 500 }
    );
  }
}
