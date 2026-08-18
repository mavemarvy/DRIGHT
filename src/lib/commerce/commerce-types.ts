export type CheckoutItem = {
  listingId: string;
  quantity: number;
};

export type CheckoutDraft = {
  items: CheckoutItem[];
  currency?: string;
};

export type CheckoutResult = {
  orderId: string;
  transactionId?: string;
  status: 'pending_payment' | 'paid' | 'failed';
};

/**
 * Commerce boundary: UI must never mark an order paid by itself.
 * Payment-provider verification is authoritative.
 */
export const COMMERCE_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  PAID: 'paid',
  FAILED: 'failed',
} as const;
