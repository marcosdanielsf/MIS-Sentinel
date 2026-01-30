import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import {
  verifyWebhookSignature,
  mapStripeAccountStatus,
  getAccountBalance
} from '@/lib/stripe';
import {
  StripeWebhookEvent,
  TransactionType,
  TransactionStatus,
  StripeTransaction
} from '@/types/stripe';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Webhook secret from Stripe Dashboard
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

if (!WEBHOOK_SECRET) {
  console.warn('STRIPE_WEBHOOK_SECRET is not set. Webhooks will not work.');
}

/**
 * POST /api/stripe/webhooks
 * Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature found' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = verifyWebhookSignature(body, signature, WEBHOOK_SECRET);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log(`[Webhook] Received event: ${event.type}`);

    // Route event to appropriate handler
    switch (event.type) {
      // Account events
      case StripeWebhookEvent.ACCOUNT_UPDATED:
        await handleAccountUpdated(event);
        break;

      case StripeWebhookEvent.ACCOUNT_EXTERNAL_ACCOUNT_CREATED:
        await handleExternalAccountCreated(event);
        break;

      case StripeWebhookEvent.ACCOUNT_EXTERNAL_ACCOUNT_DELETED:
        await handleExternalAccountDeleted(event);
        break;

      // Payment Intent events
      case StripeWebhookEvent.PAYMENT_INTENT_SUCCEEDED:
        await handlePaymentIntentSucceeded(event);
        break;

      case StripeWebhookEvent.PAYMENT_INTENT_FAILED:
        await handlePaymentIntentFailed(event);
        break;

      case StripeWebhookEvent.PAYMENT_INTENT_CANCELED:
        await handlePaymentIntentCanceled(event);
        break;

      // Charge events
      case StripeWebhookEvent.CHARGE_SUCCEEDED:
        await handleChargeSucceeded(event);
        break;

      case StripeWebhookEvent.CHARGE_FAILED:
        await handleChargeFailed(event);
        break;

      case StripeWebhookEvent.CHARGE_REFUNDED:
        await handleChargeRefunded(event);
        break;

      // Transfer events
      case StripeWebhookEvent.TRANSFER_CREATED:
        await handleTransferCreated(event);
        break;

      case StripeWebhookEvent.TRANSFER_UPDATED:
        await handleTransferUpdated(event);
        break;

//       case "transfer.failed":
//         await handleTransferFailed(event);
//         break;

      // Payout events
      case StripeWebhookEvent.PAYOUT_PAID:
        await handlePayoutPaid(event);
        break;

      case StripeWebhookEvent.PAYOUT_FAILED:
        await handlePayoutFailed(event);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle account.updated event
 * Updates partner account status when Stripe account changes
 */
async function handleAccountUpdated(event: Stripe.Event) {
  const account = event.data.object as Stripe.Account;

  console.log(`[Webhook] Account updated: ${account.id}`);

  const { data: partnerAccount } = await supabase
    .from('partner_stripe_accounts')
    .select('*')
    .eq('stripe_account_id', account.id)
    .single();

  if (!partnerAccount) {
    console.log(`[Webhook] Partner account not found for: ${account.id}`);
    return;
  }

  const newStatus = mapStripeAccountStatus(account);

  await supabase
    .from('partner_stripe_accounts')
    .update({
      stripe_account_status: newStatus,
      details_submitted: account.details_submitted || false,
      charges_enabled: account.charges_enabled || false,
      payouts_enabled: account.payouts_enabled || false,
      onboarding_completed: account.charges_enabled && account.payouts_enabled,
      business_name: account.business_profile?.name,
      phone: account.business_profile?.support_phone,
      updated_at: new Date().toISOString()
    })
    .eq('id', partnerAccount.id);

  console.log(`[Webhook] Partner account updated: ${partnerAccount.id}`);
}

/**
 * Handle account.external_account.created event
 */
async function handleExternalAccountCreated(event: Stripe.Event) {
  const externalAccount = event.data.object as Stripe.BankAccount | Stripe.Card;
  const accountId = (externalAccount as any).account;

  console.log(`[Webhook] External account created for: ${accountId}`);

  // Optionally store external account details
  // Could be useful for displaying bank info to partner
}

/**
 * Handle account.external_account.deleted event
 */
async function handleExternalAccountDeleted(event: Stripe.Event) {
  const externalAccount = event.data.object as Stripe.BankAccount | Stripe.Card;
  const accountId = (externalAccount as any).account;

  console.log(`[Webhook] External account deleted for: ${accountId}`);
}

/**
 * Handle payment_intent.succeeded event
 * Creates transaction record and updates partner balances
 */
async function handlePaymentIntentSucceeded(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  console.log(`[Webhook] Payment succeeded: ${paymentIntent.id}`);

  const partner_id = paymentIntent.metadata?.partner_id;
  if (!partner_id) {
    console.log('[Webhook] No partner_id in payment metadata');
    return;
  }

  // Get partner account
  const { data: partnerAccount } = await supabase
    .from('partner_stripe_accounts')
    .select('*')
    .eq('partner_id', partner_id)
    .single();

  if (!partnerAccount) {
    console.error(`[Webhook] Partner account not found: ${partner_id}`);
    return;
  }

  // Calculate amounts from metadata
  const commission_amount = parseInt(paymentIntent.metadata?.commission_amount || '0');
  const platform_amount = parseInt(paymentIntent.metadata?.platform_amount || '0');
  const commission_rate = parseFloat(paymentIntent.metadata?.commission_rate || '0');

  // Create transaction record
  const transaction: Omit<StripeTransaction, 'id' | 'created_at' | 'updated_at'> = {
    partner_id,
    stripe_account_id: partnerAccount.stripe_account_id,
    transaction_type: TransactionType.PAYMENT,
    status: TransactionStatus.SUCCEEDED,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    commission_amount,
    commission_rate,
    net_amount: platform_amount,
    stripe_payment_intent_id: paymentIntent.id,
    stripe_charge_id: paymentIntent.latest_charge as string,
    customer_email: paymentIntent.receipt_email || undefined,
    description: paymentIntent.description || undefined,
    metadata: paymentIntent.metadata,
    completed_at: new Date().toISOString()
  };

  await supabase
    .from('stripe_transactions')
    .insert(transaction);

  // Update partner balances
  await supabase.rpc('update_partner_balance', {
    p_partner_id: partner_id,
    p_commission_amount: commission_amount
  });

  console.log(`[Webhook] Transaction created for partner: ${partner_id}`);
}

/**
 * Handle payment_intent.payment_failed event
 */
async function handlePaymentIntentFailed(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  console.log(`[Webhook] Payment failed: ${paymentIntent.id}`);

  const partner_id = paymentIntent.metadata?.partner_id;
  if (!partner_id) return;

  // Create failed transaction record
  const transaction: Omit<StripeTransaction, 'id' | 'created_at' | 'updated_at'> = {
    partner_id,
    stripe_account_id: paymentIntent.metadata?.stripe_account_id || '',
    transaction_type: TransactionType.PAYMENT,
    status: TransactionStatus.FAILED,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    commission_amount: 0,
    commission_rate: 0,
    net_amount: 0,
    stripe_payment_intent_id: paymentIntent.id,
    description: paymentIntent.description || undefined,
    failed_reason: paymentIntent.last_payment_error?.message,
    metadata: paymentIntent.metadata
  };

  await supabase
    .from('stripe_transactions')
    .insert(transaction);
}

/**
 * Handle payment_intent.canceled event
 */
async function handlePaymentIntentCanceled(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  console.log(`[Webhook] Payment canceled: ${paymentIntent.id}`);

  // Update existing transaction if exists
  await supabase
    .from('stripe_transactions')
    .update({
      status: TransactionStatus.CANCELED,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);
}

/**
 * Handle charge.succeeded event
 */
async function handleChargeSucceeded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;
  console.log(`[Webhook] Charge succeeded: ${charge.id}`);

  // Update transaction with charge details
  if (charge.payment_intent) {
    await supabase
      .from('stripe_transactions')
      .update({
        stripe_charge_id: charge.id,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', charge.payment_intent);
  }
}

/**
 * Handle charge.failed event
 */
async function handleChargeFailed(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;
  console.log(`[Webhook] Charge failed: ${charge.id}`);

  // Update transaction status
  if (charge.payment_intent) {
    await supabase
      .from('stripe_transactions')
      .update({
        status: TransactionStatus.FAILED,
        failed_reason: charge.failure_message || undefined,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', charge.payment_intent);
  }
}

/**
 * Handle charge.refunded event
 */
async function handleChargeRefunded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;
  console.log(`[Webhook] Charge refunded: ${charge.id}`);

  // Get original transaction
  const { data: originalTx } = await supabase
    .from('stripe_transactions')
    .select('*')
    .eq('stripe_charge_id', charge.id)
    .single();

  if (!originalTx) {
    console.error('[Webhook] Original transaction not found for refund');
    return;
  }

  // Create refund transaction
  const refundAmount = charge.amount_refunded;
  const refundCommission = Math.round(refundAmount * originalTx.commission_rate);

  const refundTx: Omit<StripeTransaction, 'id' | 'created_at' | 'updated_at'> = {
    partner_id: originalTx.partner_id,
    stripe_account_id: originalTx.stripe_account_id,
    transaction_type: TransactionType.REFUND,
    status: TransactionStatus.SUCCEEDED,
    amount: -refundAmount,
    currency: originalTx.currency,
    commission_amount: -refundCommission,
    commission_rate: originalTx.commission_rate,
    net_amount: -(refundAmount - refundCommission),
    stripe_charge_id: charge.id,
    stripe_refund_id: charge.refunds?.data[0]?.id,
    description: `Refund for ${originalTx.description || charge.id}`,
    metadata: originalTx.metadata,
    completed_at: new Date().toISOString()
  };

  await supabase
    .from('stripe_transactions')
    .insert(refundTx);

  // Update partner balance (subtract refund)
  await supabase.rpc('update_partner_balance', {
    p_partner_id: originalTx.partner_id,
    p_commission_amount: -refundCommission
  });

  // Mark original transaction as refunded
  await supabase
    .from('stripe_transactions')
    .update({
      status: TransactionStatus.REFUNDED,
      updated_at: new Date().toISOString()
    })
    .eq('id', originalTx.id);
}

/**
 * Handle transfer.created event
 */
async function handleTransferCreated(event: Stripe.Event) {
  const transfer = event.data.object as Stripe.Transfer;
  console.log(`[Webhook] Transfer created: ${transfer.id}`);

  // Update transaction with transfer ID
  await supabase
    .from('stripe_transactions')
    .update({
      stripe_transfer_id: transfer.id,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_payment_intent_id', transfer.source_transaction as string);
}

/**
 * Handle transfer.updated event
 */
async function handleTransferUpdated(event: Stripe.Event) {
  const transfer = event.data.object as Stripe.Transfer;
  console.log(`[Webhook] Transfer updated: ${transfer.id}`);
}

/**
 * Handle transfer.failed event
 */
async function handleTransferFailed(event: Stripe.Event) {
  const transfer = event.data.object as Stripe.Transfer;
  console.log(`[Webhook] Transfer failed: ${transfer.id}`);

  // Mark transaction as failed
  await supabase
    .from('stripe_transactions')
    .update({
      status: TransactionStatus.FAILED,
      failed_reason: (transfer as any).failure_message || 'Transfer failed',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_transfer_id', transfer.id);
}

/**
 * Handle payout.paid event
 */
async function handlePayoutPaid(event: Stripe.Event) {
  const payout = event.data.object as Stripe.Payout;
  const accountId = event.account;

  console.log(`[Webhook] Payout paid: ${payout.id} for account: ${accountId}`);

  // Get partner account
  const { data: partnerAccount } = await supabase
    .from('partner_stripe_accounts')
    .select('*')
    .eq('stripe_account_id', accountId)
    .single();

  if (!partnerAccount) {
    console.error(`[Webhook] Partner account not found: ${accountId}`);
    return;
  }

  // Update or create payout record
  await supabase
    .from('partner_payouts')
    .upsert({
      partner_id: partnerAccount.partner_id,
      stripe_account_id: accountId,
      stripe_payout_id: payout.id,
      amount: payout.amount,
      currency: payout.currency,
      status: 'paid',
      arrival_date: new Date(payout.arrival_date * 1000).toISOString(),
      method: payout.method,
      description: payout.description || undefined,
      paid_at: new Date().toISOString()
    }, {
      onConflict: 'stripe_payout_id'
    });

  // Update partner last payout date
  await supabase
    .from('partner_stripe_accounts')
    .update({
      last_payout_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', partnerAccount.id);

  console.log(`[Webhook] Payout recorded for partner: ${partnerAccount.partner_id}`);
}

/**
 * Handle payout.failed event
 */
async function handlePayoutFailed(event: Stripe.Event) {
  const payout = event.data.object as Stripe.Payout;
  const accountId = event.account;

  console.log(`[Webhook] Payout failed: ${payout.id}`);

  // Update payout record
  await supabase
    .from('partner_payouts')
    .update({
      status: 'failed',
      failure_code: payout.failure_code || undefined,
      failure_message: payout.failure_message || undefined,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_payout_id', payout.id);
}
