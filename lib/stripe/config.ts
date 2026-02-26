import type { SubscriptionTier } from "@/types/database";

export interface PlanConfig {
  name: string;
  price: number;
  stripePriceId: string | null;
  limits: {
    activeDeals: number;
    prospectSearches: number;
    integrations: boolean;
    aiBriefings: boolean;
    callTranscripts: boolean;
  };
}

export const PLANS: Record<SubscriptionTier, PlanConfig> = {
  free: {
    name: "Free",
    price: 0,
    stripePriceId: null,
    limits: {
      activeDeals: 3,
      prospectSearches: 0,
      integrations: false,
      aiBriefings: false,
      callTranscripts: false,
    },
  },
  starter: {
    name: "Starter",
    price: 49,
    stripePriceId: process.env.STRIPE_PRICE_ID_STARTER ?? null,
    limits: {
      activeDeals: Infinity,
      prospectSearches: 10,
      integrations: true,
      aiBriefings: false,
      callTranscripts: false,
    },
  },
  power: {
    name: "Power",
    price: 149,
    stripePriceId: process.env.STRIPE_PRICE_ID_POWER ?? null,
    limits: {
      activeDeals: Infinity,
      prospectSearches: Infinity,
      integrations: true,
      aiBriefings: true,
      callTranscripts: true,
    },
  },
};
