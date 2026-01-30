import Stripe from 'stripe';

/**
 * Partner Tiers with Commission Rates
 */
export enum PartnerTier {
  STARTER = 'starter',
  GROWTH = 'growth',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise'
}

/**
 * Commission rates for each tier
 */
export const COMMISSION_RATES: Record<PartnerTier, number> = {
  [PartnerTier.STARTER]: 0.15,    // 15%
  [PartnerTier.GROWTH]: 0.20,     // 20%
  [PartnerTier.PREMIUM]: 0.25,    // 25%
  [PartnerTier.ENTERPRISE]: 0.30  // 30%
};

/**
 * Stripe Connect Account Status
 */
export enum StripeAccountStatus {
  PENDING = 'pending',           // Account created but not verified
  ACTIVE = 'active',             // Account fully verified and active
  RESTRICTED = 'restricted',     // Account has restrictions
  REJECTED = 'rejected',         // Account verification rejected
  INACTIVE = 'inactive'          // Account deactivated
}

/**
 * Partner Stripe Account Interface
 */
export interface PartnerStripeAccount {
  id: string;                           // Internal DB ID
  partner_id: string;                   // Partner user ID
  stripe_account_id: string;            // Stripe Connect Account ID
  stripe_account_status: StripeAccountStatus;
  tier: PartnerTier;
  commission_rate: number;              // Decimal (0.15 = 15%)
  onboarding_completed: boolean;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  country: string;                      // ISO country code
  currency: string;                     // ISO currency code (e.g., 'brl', 'usd')
  business_type?: string;               // 'individual' | 'company'
  business_name?: string;
  email?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  last_payout_at?: string;
  total_earnings: number;               // Total commissions earned
  pending_balance: number;              // Pending payout amount
  available_balance: number;            // Available for payout
  metadata?: Record<string, any>;
}

/**
 * Stripe Connect Onboarding Link Response
 */
export interface StripeOnboardingLink {
  url: string;
  expires_at: number;
  created: number;
  object: 'account_link';
}

/**
 * Payment Intent with Transfer Data
 */
export interface PaymentIntentWithTransfer extends Omit<Stripe.PaymentIntent, "transfer_data" | "application_fee_amount"> {
  transfer_data?: {
    destination: string;
    amount?: number;
  };
  application_fee_amount?: number;
}

/**
 * Transaction Types
 */
export enum TransactionType {
  PAYMENT = 'payment',               // Customer payment
  COMMISSION = 'commission',         // Partner commission
  PAYOUT = 'payout',                 // Payout to partner
  REFUND = 'refund',                 // Refund to customer
  ADJUSTMENT = 'adjustment'          // Manual adjustment
}

/**
 * Transaction Status
 */
export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REFUNDED = 'refunded'
}

/**
 * Transaction Record
 */
export interface StripeTransaction {
  id: string;                           // Internal DB ID
  partner_id: string;                   // Partner user ID
  stripe_account_id: string;            // Partner's Stripe account
  transaction_type: TransactionType;
  status: TransactionStatus;
  amount: number;                       // Amount in cents
  currency: string;                     // ISO currency code
  commission_amount: number;            // Commission in cents
  commission_rate: number;              // Rate applied (0.15 = 15%)
  net_amount: number;                   // Net to MOTTIVME after commission
  stripe_payment_intent_id?: string;    // Stripe PaymentIntent ID
  stripe_transfer_id?: string;          // Stripe Transfer ID
  stripe_payout_id?: string;            // Stripe Payout ID
  stripe_charge_id?: string;            // Stripe Charge ID
  stripe_refund_id?: string;            // Stripe Refund ID
  customer_id?: string;                 // Customer ID (if applicable)
  customer_email?: string;
  description?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  failed_reason?: string;
}

/**
 * Payout Record
 */
export interface PartnerPayout {
  id: string;                           // Internal DB ID
  partner_id: string;
  stripe_account_id: string;
  stripe_payout_id: string;
  amount: number;                       // Amount in cents
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'canceled';
  arrival_date?: string;                // Expected arrival date
  method: 'standard' | 'instant';       // Payout method
  description?: string;
  failure_code?: string;
  failure_message?: string;
  created_at: string;
  updated_at: string;
  paid_at?: string;
}

/**
 * Webhook Event Types
 */
export enum StripeWebhookEvent {
  // Account events
  ACCOUNT_UPDATED = 'account.updated',
  ACCOUNT_EXTERNAL_ACCOUNT_CREATED = 'account.external_account.created',
  ACCOUNT_EXTERNAL_ACCOUNT_DELETED = 'account.external_account.deleted',

  // Payment events
  PAYMENT_INTENT_CREATED = 'payment_intent.created',
  PAYMENT_INTENT_SUCCEEDED = 'payment_intent.succeeded',
  PAYMENT_INTENT_FAILED = 'payment_intent.payment_failed',
  PAYMENT_INTENT_CANCELED = 'payment_intent.canceled',

  // Charge events
  CHARGE_SUCCEEDED = 'charge.succeeded',
  CHARGE_FAILED = 'charge.failed',
  CHARGE_REFUNDED = 'charge.refunded',

  // Transfer events
  TRANSFER_CREATED = 'transfer.created',
  TRANSFER_UPDATED = 'transfer.updated',
  TRANSFER_REVERSED = 'transfer.reversed',
  TRANSFER_FAILED = 'transfer.failed',

  // Payout events
  PAYOUT_CREATED = 'payout.created',
  PAYOUT_PAID = 'payout.paid',
  PAYOUT_FAILED = 'payout.failed',
  PAYOUT_CANCELED = 'payout.canceled',

  // Refund events
  REFUND_CREATED = 'charge.refund.created',
  REFUND_UPDATED = 'charge.refund.updated'
}

/**
 * Webhook Payload
 */
export interface StripeWebhookPayload {
  id: string;
  object: 'event';
  type: StripeWebhookEvent;
  data: {
    object: any;
    previous_attributes?: any;
  };
  created: number;
  livemode: boolean;
  pending_webhooks: number;
  request?: {
    id: string;
    idempotency_key?: string;
  };
}

/**
 * Create Payment Intent Parameters
 */
export interface CreatePaymentIntentParams {
  amount: number;                       // Amount in cents
  currency: string;                     // ISO currency code
  partner_id: string;                   // Partner receiving commission
  customer_id?: string;                 // Stripe Customer ID
  customer_email?: string;
  description?: string;
  metadata?: Record<string, any>;
  automatic_payment_methods?: boolean;
  return_url?: string;                  // For redirect-based flows
}

/**
 * Create Connect Account Parameters
 */
export interface CreateConnectAccountParams {
  partner_id: string;
  email: string;
  country?: string;                     // Default: 'BR'
  business_type?: 'individual' | 'company';
  metadata?: Record<string, any>;
}

/**
 * Create Account Link Parameters
 */
export interface CreateAccountLinkParams {
  account_id: string;
  refresh_url: string;                  // URL to redirect if link expires
  return_url: string;                   // URL after onboarding complete
  type: 'account_onboarding' | 'account_update';
}

/**
 * Calculate Split Parameters
 */
export interface CalculateSplitParams {
  amount: number;                       // Total amount in cents
  commission_rate: number;              // Rate (0.15 = 15%)
}

/**
 * Calculate Split Result
 */
export interface SplitCalculation {
  total_amount: number;                 // Total payment amount
  commission_amount: number;            // Partner commission
  platform_amount: number;              // MOTTIVME net amount
  stripe_fee_estimate: number;          // Estimated Stripe fee
  commission_rate: number;              // Applied rate
}

/**
 * Stripe Error Response
 */
export interface StripeErrorResponse {
  error: {
    type: string;
    message: string;
    code?: string;
    param?: string;
    decline_code?: string;
  };
}

/**
 * API Response Types
 */
export type StripeApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: StripeErrorResponse['error'] };
