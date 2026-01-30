import Stripe from 'stripe';
import {
  PartnerTier,
  COMMISSION_RATES,
  CreatePaymentIntentParams,
  CreateConnectAccountParams,
  CreateAccountLinkParams,
  CalculateSplitParams,
  SplitCalculation,
  StripeAccountStatus,
  PartnerStripeAccount
} from '@/types/stripe';

// Initialize Stripe with API key
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia' as any,
  typescript: true,
  appInfo: {
    name: 'MIS Sentinel - BPOSS White Label',
    version: '1.0.0',
    url: 'https://mis-sentinel.mottivme.com'
  }
});

/**
 * Stripe Connect Account Type
 * Using 'express' for easier onboarding and management
 */
const CONNECT_ACCOUNT_TYPE = 'express' as const;

/**
 * Calculate payment split between platform and partner
 */
export function calculateSplit(params: CalculateSplitParams): SplitCalculation {
  const { amount, commission_rate } = params;

  // Calculate amounts
  const commission_amount = Math.round(amount * commission_rate);
  const platform_amount = amount - commission_amount;

  // Estimate Stripe fees (2.9% + $0.30 for US, adjust for Brazil)
  const stripe_fee_estimate = Math.round(amount * 0.029 + 30);

  return {
    total_amount: amount,
    commission_amount,
    platform_amount,
    stripe_fee_estimate,
    commission_rate
  };
}

/**
 * Get commission rate for a partner tier
 */
export function getCommissionRate(tier: PartnerTier): number {
  return COMMISSION_RATES[tier];
}

/**
 * Create a Stripe Connect Express account for a partner
 */
export async function createConnectAccount(
  params: CreateConnectAccountParams
): Promise<Stripe.Account> {
  const {
    partner_id,
    email,
    country = 'BR', // Default to Brazil
    business_type = 'individual',
    metadata = {}
  } = params;

  try {
    const account = await stripe.accounts.create({
      type: CONNECT_ACCOUNT_TYPE,
      country,
      email,
      business_type,
      capabilities: {
        // Enable card payments and transfers
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      metadata: {
        partner_id,
        platform: 'bposs_white_label',
        created_via: 'api',
        ...metadata
      }
    });

    return account;
  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    throw error;
  }
}

/**
 * Create an account link for onboarding or account updates
 */
export async function createAccountLink(
  params: CreateAccountLinkParams
): Promise<Stripe.AccountLink> {
  const { account_id, refresh_url, return_url, type } = params;

  try {
    const accountLink = await stripe.accountLinks.create({
      account: account_id,
      refresh_url,
      return_url,
      type
    });

    return accountLink;
  } catch (error) {
    console.error('Error creating account link:', error);
    throw error;
  }
}

/**
 * Retrieve a Connect account by ID
 */
export async function getConnectAccount(
  accountId: string
): Promise<Stripe.Account> {
  try {
    const account = await stripe.accounts.retrieve(accountId);
    return account;
  } catch (error) {
    console.error('Error retrieving Stripe account:', error);
    throw error;
  }
}

/**
 * Update Connect account metadata or settings
 */
export async function updateConnectAccount(
  accountId: string,
  updates: Stripe.AccountUpdateParams
): Promise<Stripe.Account> {
  try {
    const account = await stripe.accounts.update(accountId, updates);
    return account;
  } catch (error) {
    console.error('Error updating Stripe account:', error);
    throw error;
  }
}

/**
 * Delete/deactivate a Connect account
 */
export async function deleteConnectAccount(
  accountId: string
): Promise<Stripe.DeletedAccount> {
  try {
    const deleted = await stripe.accounts.del(accountId);
    return deleted;
  } catch (error) {
    console.error('Error deleting Stripe account:', error);
    throw error;
  }
}

/**
 * Create a payment intent with automatic transfer to partner
 */
export async function createPaymentIntentWithTransfer(
  params: CreatePaymentIntentParams,
  partnerAccount: PartnerStripeAccount
): Promise<Stripe.PaymentIntent> {
  const {
    amount,
    currency,
    customer_id,
    customer_email,
    description,
    metadata = {},
    automatic_payment_methods = true,
    return_url
  } = params;

  // Calculate split
  const split = calculateSplit({
    amount,
    commission_rate: partnerAccount.commission_rate
  });

  try {
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount,
      currency: currency.toLowerCase(),
      customer: customer_id,
      description: description || `Payment for ${partnerAccount.business_name || 'MOTTIVME service'}`,

      // Transfer commission to partner
      transfer_data: {
        destination: partnerAccount.stripe_account_id,
        amount: split.commission_amount
      },

      // Platform keeps the difference automatically
      application_fee_amount: split.platform_amount,

      metadata: {
        partner_id: partnerAccount.partner_id,
        partner_tier: partnerAccount.tier,
        commission_rate: partnerAccount.commission_rate.toString(),
        commission_amount: split.commission_amount.toString(),
        platform_amount: split.platform_amount.toString(),
        ...metadata
      },

      // Enable receipt emails
      receipt_email: customer_email
    };

    // Add automatic payment methods if enabled
    if (automatic_payment_methods) {
      paymentIntentParams.automatic_payment_methods = {
        enabled: true,
        allow_redirects: 'never'
      };
    }

    // Add return URL if provided (for redirect-based flows)
    if (return_url) {
      paymentIntentParams.return_url = return_url;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent with transfer:', error);
    throw error;
  }
}

/**
 * Create a direct charge to a connected account
 * (Alternative to transfer_data - use for different scenarios)
 */
export async function createDirectCharge(
  params: CreatePaymentIntentParams,
  partnerAccount: PartnerStripeAccount
): Promise<Stripe.PaymentIntent> {
  const {
    amount,
    currency,
    customer_id,
    customer_email,
    description,
    metadata = {}
  } = params;

  // Calculate platform fee (inverse of commission)
  const split = calculateSplit({
    amount,
    commission_rate: partnerAccount.commission_rate
  });

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
      customer: customer_id,
      description,
      application_fee_amount: split.platform_amount,
      receipt_email: customer_email,
      metadata: {
        partner_id: partnerAccount.partner_id,
        partner_tier: partnerAccount.tier,
        commission_rate: partnerAccount.commission_rate.toString(),
        ...metadata
      }
    }, {
      stripeAccount: partnerAccount.stripe_account_id
    });

    return paymentIntent;
  } catch (error) {
    console.error('Error creating direct charge:', error);
    throw error;
  }
}

/**
 * Refund a payment
 */
export async function createRefund(
  paymentIntentId: string,
  amount?: number,
  reason?: Stripe.RefundCreateParams.Reason
): Promise<Stripe.Refund> {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount, // Partial refund if specified, full refund if omitted
      reason: reason || 'requested_by_customer'
    });

    return refund;
  } catch (error) {
    console.error('Error creating refund:', error);
    throw error;
  }
}

/**
 * Get account balance for a connected account
 */
export async function getAccountBalance(
  accountId: string
): Promise<Stripe.Balance> {
  try {
    const balance = await stripe.balance.retrieve({
      stripeAccount: accountId
    });

    return balance;
  } catch (error) {
    console.error('Error retrieving account balance:', error);
    throw error;
  }
}

/**
 * List payouts for a connected account
 */
export async function listPayouts(
  accountId: string,
  limit: number = 10
): Promise<Stripe.ApiList<Stripe.Payout>> {
  try {
    const payouts = await stripe.payouts.list({
      limit
    }, {
      stripeAccount: accountId
    });

    return payouts;
  } catch (error) {
    console.error('Error listing payouts:', error);
    throw error;
  }
}

/**
 * Create a payout to a connected account's bank account
 */
export async function createPayout(
  accountId: string,
  amount: number,
  currency: string = 'brl',
  description?: string
): Promise<Stripe.Payout> {
  try {
    const payout = await stripe.payouts.create({
      amount,
      currency,
      description,
      method: 'standard' // or 'instant' for instant payouts
    }, {
      stripeAccount: accountId
    });

    return payout;
  } catch (error) {
    console.error('Error creating payout:', error);
    throw error;
  }
}

/**
 * List transfers to a connected account
 */
export async function listTransfers(
  destination: string,
  limit: number = 10
): Promise<Stripe.ApiList<Stripe.Transfer>> {
  try {
    const transfers = await stripe.transfers.list({
      destination,
      limit
    });

    return transfers;
  } catch (error) {
    console.error('Error listing transfers:', error);
    throw error;
  }
}

/**
 * Reverse a transfer (cancel/refund to platform)
 */
export async function reverseTransfer(
  transferId: string,
  amount?: number
): Promise<Stripe.TransferReversal> {
  try {
    const reversal = await stripe.transfers.createReversal(transferId, {
      amount // Partial reversal if specified, full if omitted
    });

    return reversal;
  } catch (error) {
    console.error('Error reversing transfer:', error);
    throw error;
  }
}

/**
 * Map Stripe account to internal status
 */
export function mapStripeAccountStatus(account: Stripe.Account): StripeAccountStatus {
  if (!account.charges_enabled && !account.payouts_enabled) {
    return StripeAccountStatus.PENDING;
  }

  if (account.charges_enabled && account.payouts_enabled) {
    return StripeAccountStatus.ACTIVE;
  }

  if (account.requirements?.disabled_reason) {
    const reason = account.requirements.disabled_reason;
    if (reason === 'rejected.fraud' || reason === 'rejected.terms_of_service') {
      return StripeAccountStatus.REJECTED;
    }
    return StripeAccountStatus.RESTRICTED;
  }

  return StripeAccountStatus.PENDING;
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, secret);
    return event;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    throw new Error('Invalid webhook signature');
  }
}

/**
 * Format amount for display (cents to currency)
 */
export function formatAmount(amount: number, currency: string = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase()
  }).format(amount / 100);
}

/**
 * Convert currency string to cents
 */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convert cents to currency
 */
export function fromCents(amount: number): number {
  return amount / 100;
}
