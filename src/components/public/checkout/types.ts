/**
 * Types for the unified Lynk-X public checkout engine.
 * Supports isolated contexts for ticket purchases and recurring subscriptions.
 */

export type CheckoutType = 'tickets' | 'subscription';

export interface SubscriptionPrice {
  id: string;
  country_code: string;
  currency: string;
  amount: number;
  external_gateway_id?: string | null;
  is_active: boolean;
}

export interface SubscriptionFeature {
  feature_id: string;
  feature_value: string;
  display_name: string;
}

export interface SubscriptionPlan {
  id: string;
  display_name: string;
  description: string;
  product_type: string;
  interval: 'month' | 'year';
  is_active: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  subscription_prices: SubscriptionPrice[];
  plan_features: SubscriptionFeature[];
}
