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

// Lazy initialization of Stripe client
let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
    }
    _stripe = new Stripe(key, {
      apiVersion: '2024-12-18.acacia' as any,
      typescript: true,
      appInfo: {
        name: 'MIS Sentinel - BPOSS White Label',
        version: '1.0.0',
        url: 'https://mis-sentinel.mottivme.com'
      }
    });
  }
  return _stripe;
}

// Export stripe getter for direct access when needed
export const stripe = { get: getStripe };

/**
 * Stripe Connect Account Type
 */
const CONNECT_ACCOUNT_TYPE = 'express' as const;

/**
 * Calculate payment split between platform and partner
 */
export function calculateSplit(params: CalculateSplitParams): SplitCalculation {
  const { amount, commission_rate } = params;
  const commission_amount = Math.round(amount * commission_rate);
  const platform_amount = amount - commission_amount;
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
    country = 'BR',
    business_type = 'individual',
    metadata = {}
  } = params;

  const account = await getStripe().accounts.create({
    type: CONNECT_ACCOUNT_TYPE,
    country,
    email,
    business_type,
    capabilities: {
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
}

/**
 * Create an account link for onboarding or account updates
 */
export async function createAccountLink(
  params: CreateAccountLinkParams
): Promise<Stripe.AccountLink> {
  const { account_id, refresh_url, return_url, type } = params;

  const accountLink = await getStripe().accountLinks.create({
    account: account_id,
    refresh_url,
    return_url,
    type
  });

  return accountLink;
}

/**
 * Retrieve a Connect account by ID
 */
export async function getConnectAccount(accountId: string): Promise<Stripe.Account> {
  return await getStripe().accounts.retrieve(accountId);
}

/**
 * Update Connect account
 */
export async function updateConnectAccount(
  accountId: string,
  updates: Stripe.AccountUpdateParams
): Promise<Stripe.Account> {
  return await getStripe().accounts.update(accountId, updates);
}

/**
 * Delete/deactivate a Connect account
 */
export async function deleteConnectAccount(accountId: string): Promise<Stripe.DeletedAccount> {
  return await getStripe().accounts.del(accountId);
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

  const split = calculateSplit({
    amount,
    commission_rate: partnerAccount.commission_rate
  });

  const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
    amount,
    currency: currency.toLowerCase(),
    customer: customer_id,
    description: description || `Payment for ${partnerAccount.business_name || 'MOTTIVME service'}`,
    transfer_data: {
      destination: partnerAccount.stripe_account_id,
      amount: split.commission_amount
    },
    application_fee_amount: split.platform_amount,
    metadata: {
      partner_id: partnerAccount.partner_id,
      partner_tier: partnerAccount.tier,
      commission_rate: partnerAccount.commission_rate.toString(),
      commission_amount: split.commission_amount.toString(),
      platform_amount: split.platform_amount.toString(),
      ...metadata
    },
    receipt_email: customer_email
  };

  if (automatic_payment_methods) {
    paymentIntentParams.automatic_payment_methods = {
      enabled: true,
      allow_redirects: 'never'
    };
  }

  if (return_url) {
    paymentIntentParams.return_url = return_url;
  }

  return await getStripe().paymentIntents.create(paymentIntentParams);
}

/**
 * Get account balance for a connected account
 */
export async function getAccountBalance(accountId: string): Promise<Stripe.Balance> {
  return await getStripe().balance.retrieve({ stripeAccount: accountId });
}

/**
 * List payouts for a connected account
 */
export async function listPayouts(
  accountId: string,
  limit: number = 10
): Promise<Stripe.ApiList<Stripe.Payout>> {
  return await getStripe().payouts.list({ limit }, { stripeAccount: accountId });
}

/**
 * Create a payout
 */
export async function createPayout(
  accountId: string,
  amount: number,
  currency: string = 'brl',
  description?: string
): Promise<Stripe.Payout> {
  return await getStripe().payouts.create(
    { amount, currency, description, method: 'standard' },
    { stripeAccount: accountId }
  );
}

/**
 * List transfers to a connected account
 */
export async function listTransfers(
  destination: string,
  limit: number = 10
): Promise<Stripe.ApiList<Stripe.Transfer>> {
  return await getStripe().transfers.list({ destination, limit });
}

/**
 * Reverse a transfer
 */
export async function reverseTransfer(
  transferId: string,
  amount?: number
): Promise<Stripe.TransferReversal> {
  return await getStripe().transfers.createReversal(transferId, { amount });
}

/**
 * Create refund
 */
export async function createRefund(
  paymentIntentId: string,
  amount?: number,
  reason?: Stripe.RefundCreateParams.Reason
): Promise<Stripe.Refund> {
  return await getStripe().refunds.create({
    payment_intent: paymentIntentId,
    amount,
    reason: reason || 'requested_by_customer'
  });
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
  return getStripe().webhooks.constructEvent(payload, signature, secret);
}

/**
 * Format amount for display
 */
export function formatAmount(amount: number, currency: string = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase()
  }).format(amount / 100);
}

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(amount: number): number {
  return amount / 100;
}
