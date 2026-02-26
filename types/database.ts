// RevSignal Database Types
// These match the Supabase schema exactly.

export type DealStage =
  | "lead"
  | "qualified"
  | "discovery"
  | "poc_trial"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

export type ChannelType =
  | "teams"
  | "email"
  | "call"
  | "linkedin"
  | "in_person"
  | "manual";

export type ActionOwner = "me" | "them";

export type ActionStatus = "pending" | "completed" | "overdue" | "cancelled";

export type EscalationLevel = "green" | "yellow" | "red";

export type SubscriptionTier = "free" | "starter" | "power";

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "cancelled"
  | "trialing";

export type PlaybookStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "blocked"
  | "deprecated";

export type DeploymentMethod =
  | "api"
  | "flat_file"
  | "cloud_delivery"
  | "platform_integration"
  | "embedded_oem";

export type ProductTier = "signals" | "intelligence" | "embedded";

// --- Table Types ---

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  voice_profile_path: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  deal_id: string;
  user_id: string;
  company: string;
  contacts: ContactRef[];
  stage: DealStage;
  acv: number | null;
  deployment_method: DeploymentMethod | null;
  product_tier: ProductTier | null;
  contract_length_months: number | null;
  win_probability: number;
  close_date: string | null;
  notes: string | null;
  sfdc_opportunity_id: string | null;
  created_date: string;
  last_activity_date: string;
  closed_date: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactRef {
  contact_id: string;
  name: string;
  role?: string;
}

export interface Contact {
  contact_id: string;
  user_id: string;
  company: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  icp_category: string | null;
  is_internal: boolean;
  sfdc_contact_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  conversation_id: string;
  user_id: string;
  contact_id: string | null;
  deal_id: string | null;
  date: string;
  channel: ChannelType;
  subject: string | null;
  raw_text: string | null;
  ai_summary: string | null;
  action_items: ActionItemRef[];
  follow_up_date: string | null;
  external_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActionItemRef {
  description: string;
  owner: ActionOwner;
  due_date?: string;
}

export interface ActionItem {
  item_id: string;
  user_id: string;
  deal_id: string | null;
  contact_id: string | null;
  description: string;
  owner: ActionOwner;
  due_date: string | null;
  status: ActionStatus;
  source_conversation_id: string | null;
  escalation_level: EscalationLevel;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Prospect {
  id: string;
  user_id: string;
  company: string;
  icp_category: string | null;
  contacts: ContactRef[];
  estimated_acv: number | null;
  research_notes: string | null;
  last_researched_date: string | null;
  source: string | null;
  website: string | null;
  why_they_buy: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealBrief {
  id: string;
  deal_id: string;
  user_id: string;
  brief_text: string;
  source_conversations: string[];
  last_updated: string;
  created_at: string;
}

export interface WeeklyDigest {
  id: string;
  user_id: string;
  week_start: string;
  digest_text: string;
  deals_advanced: string[];
  deals_stalled: string[];
  revenue_closed: number;
  created_at: string;
}

export interface CompetitiveIntel {
  id: string;
  user_id: string;
  competitor: string;
  category: string;
  data_point: string;
  source: string | null;
  captured_date: string;
  created_at: string;
  updated_at: string;
}

export interface PlaybookItem {
  item_id: string;
  user_id: string;
  workstream: string;
  description: string;
  status: PlaybookStatus;
  last_touched: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface IngestedMessage {
  id: string;
  user_id: string;
  source: string;
  external_id: string | null;
  raw_content: string | null;
  processed: boolean;
  matched_contact_id: string | null;
  matched_deal_id: string | null;
  processed_at: string | null;
  created_at: string;
}

export interface AgentLog {
  id: string;
  user_id: string;
  agent_name: string;
  action: string;
  input_context: Record<string, unknown> | null;
  output: string | null;
  sources_cited: string[];
  tokens_used: number | null;
  duration_ms: number | null;
  timestamp: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

// --- Pipeline Stage Config ---

export const DEAL_STAGES: { value: DealStage; label: string; color: string }[] = [
  { value: "lead", label: "Lead", color: "#6b7280" },
  { value: "qualified", label: "Qualified", color: "#8b5cf6" },
  { value: "discovery", label: "Discovery", color: "#3b82f6" },
  { value: "poc_trial", label: "POC / Trial", color: "#06b6d4" },
  { value: "proposal", label: "Proposal", color: "#eab308" },
  { value: "negotiation", label: "Negotiation", color: "#f97316" },
  { value: "closed_won", label: "Closed Won", color: "#22c55e" },
  { value: "closed_lost", label: "Closed Lost", color: "#ef4444" },
];

export const ACTIVE_STAGES: DealStage[] = [
  "lead",
  "qualified",
  "discovery",
  "poc_trial",
  "proposal",
  "negotiation",
];

// --- Revenue Math Constants ---

export const REVENUE_TARGET = 1_000_000;
export const BASE_SALARY = 225_000;
export const REV_SHARE_PERCENT = 0.25;
export const TARGET_ACV = 100_000;
export const TARGET_CUSTOMERS = 10;
