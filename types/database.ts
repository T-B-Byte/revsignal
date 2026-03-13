// RevSignal Database Types
// These match the Supabase schema exactly.

export type DealStage =
  | "lead"
  | "qualified"
  | "discovery"
  | "demo_booked"
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
  | "manual"
  | "internal";

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

// --- Meeting Notes ---

export type MeetingType =
  | "one_on_one"
  | "team"
  | "strategy"
  | "cross_functional"
  | "board"
  | "standup"
  | "other";

export interface MeetingAttendee {
  name: string;
  role?: string;
}

export type MeetingStatus = "upcoming" | "completed" | "cancelled";

export interface MeetingAgendaItem {
  text: string;
  covered: boolean;
}

export interface MeetingNote {
  note_id: string;
  user_id: string;
  title: string;
  meeting_date: string;
  meeting_type: MeetingType;
  attendees: MeetingAttendee[];
  content: string;
  ai_summary: string | null;
  action_items: ActionItemRef[];
  tags: string[];
  deal_id: string | null;
  status: MeetingStatus;
  prep_brief: string | null;
  agenda: MeetingAgendaItem[];
  contact_ids: string[];
  location: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactAgendaItem {
  item_id: string;
  user_id: string;
  contact_id: string;
  description: string;
  status: "open" | "covered" | "carried";
  source: "manual" | "strategist" | "action_item";
  covered_in_meeting: string | null;
  created_at: string;
  updated_at: string;
}

export const MEETING_STATUSES: { value: MeetingStatus; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const MEETING_TYPES: { value: MeetingType; label: string }[] = [
  { value: "one_on_one", label: "1:1" },
  { value: "team", label: "Team Meeting" },
  { value: "strategy", label: "Strategy" },
  { value: "cross_functional", label: "Cross-Functional" },
  { value: "board", label: "Board / Exec" },
  { value: "standup", label: "Standup" },
  { value: "other", label: "Other" },
];

/** pharosIQ leadership team — pre-populated for attendee autocomplete */
export const PHAROSIQ_TEAM: MeetingAttendee[] = [
  { name: "Jeff Rokuskie", role: "CEO" },
  { name: "Anthony Iafolla", role: "SVP Global Sales" },
  { name: "Raj Hajela", role: "CRO" },
  { name: "Kristin McShane", role: "CFO" },
  { name: "Anna Eliot", role: "CMO" },
  { name: "Ben Luck", role: "Chief Data Scientist" },
  { name: "Martin Fettig", role: "EVP" },
  { name: "Chris Vriavas", role: "Head of Strategy" },
  { name: "Robert Karpovich", role: "VP Sales & Operations" },
  { name: "James Kelly", role: "CCO" },
  { name: "Romano Ditoro", role: "CIO" },
  { name: "Erin Neilan", role: "GVP" },
  { name: "Maura Kane", role: "SVP Global HR" },
  { name: "Carolina Barcellos", role: "VP LATAM" },
];

// --- Strategic Context ---

export type NoteCategory =
  | "institutional_context"
  | "stakeholder_insight"
  | "decision_log"
  | "political_dynamic"
  | "meeting_debrief"
  | "strategic_observation"
  | "competitive_insight"
  | "relationship_note";

export type StakeholderRelationship =
  | "sponsor"
  | "champion"
  | "supporter"
  | "neutral"
  | "blocker"
  | "unknown";

export type NudgePriority = "low" | "medium" | "high" | "critical";

export type NudgeStatus = "pending" | "shown" | "dismissed" | "acted_on";

export interface Stakeholder {
  stakeholder_id: string;
  user_id: string;
  name: string;
  role: string | null;
  organization: string;
  is_internal: boolean;
  relationship: StakeholderRelationship;
  communication_style: string | null;
  sensitivities: string | null;
  motivations: string | null;
  influence_level: number | null;
  related_contact_id: string | null;
  notes: string | null;
  last_interaction_date: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface StrategicNote {
  note_id: string;
  user_id: string;
  category: NoteCategory;
  title: string;
  content: string;
  related_stakeholder_id: string | null;
  related_deal_id: string | null;
  source: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// --- StrategyGPT Interaction Types ---

export type InteractionType =
  | "email"
  | "conversation"
  | "call_transcript"
  | "web_meeting"
  | "in_person_meeting"
  | "coaching";

export const INTERACTION_TYPES: {
  value: InteractionType;
  label: string;
  placeholder: string;
}[] = [
  { value: "coaching", label: "Ask Strategist", placeholder: "Ask the Strategist for coaching, analysis, or advice..." },
  { value: "email", label: "Email", placeholder: "Paste email correspondence..." },
  { value: "conversation", label: "Conversation", placeholder: "Paste chat, Teams message, or informal conversation..." },
  { value: "call_transcript", label: "Call Transcript", placeholder: "Paste call recording or PLAUD transcript..." },
  { value: "web_meeting", label: "Web Meeting", placeholder: "Paste Zoom, Teams, or Google Meet notes..." },
  { value: "in_person_meeting", label: "In-Person", placeholder: "Paste notes from face-to-face meeting..." },
];

export type MessageReaction = "thumbs_up" | "ok" | "love";

export const MESSAGE_REACTIONS: { value: MessageReaction; emoji: string }[] = [
  { value: "thumbs_up", emoji: "👍" },
  { value: "ok", emoji: "👌" },
  { value: "love", emoji: "❤️" },
];

export interface CoachingMessage {
  conversation_id: string;
  user_id: string;
  thread_id: string | null;
  role: "user" | "assistant";
  content: string;
  interaction_type: InteractionType;
  context_used: Record<string, unknown> | null;
  sources_cited: string[];
  tokens_used: number | null;
  attachments?: string[];
  reaction?: MessageReaction | null;
  created_at: string;
}

// --- Coaching Threads (StrategyGPT) ---

export type ThreadFollowUpStatus = "open" | "completed" | "dismissed";

export interface CoachingThread {
  thread_id: string;
  user_id: string;
  deal_id: string | null;
  ma_entity_id: string | null;
  title: string;
  contact_name: string | null;
  contact_role: string | null;
  company: string | null;
  contact_id: string | null;
  thread_brief: string | null;
  brief_updated_at: string | null;
  last_message_at: string;
  message_count: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ThreadFollowUp {
  follow_up_id: string;
  thread_id: string;
  user_id: string;
  description: string;
  due_date: string | null;
  status: ThreadFollowUpStatus;
  source_message_id: string | null;
  created_at: string;
  completed_at: string | null;
}

/** Thread with joined deal/M&A info for sidebar display */
export interface CoachingThreadWithDeal extends CoachingThread {
  deals?: Pick<Deal, "deal_id" | "company" | "stage"> | null;
  ma_entities?: Pick<MaEntity, "entity_id" | "company" | "entity_type" | "stage"> | null;
  open_follow_up_count?: number;
  has_overdue?: boolean;
  open_task_count?: number;
}

export interface Nudge {
  nudge_id: string;
  user_id: string;
  priority: NudgePriority;
  status: NudgeStatus;
  title: string;
  message: string;
  action_url: string | null;
  source_agent: string;
  context: Record<string, unknown> | null;
  expires_at: string | null;
  shown_at: string | null;
  dismissed_at: string | null;
  created_at: string;
}

export const NOTE_CATEGORIES: { value: NoteCategory; label: string }[] = [
  { value: "institutional_context", label: "Institutional Context" },
  { value: "stakeholder_insight", label: "Stakeholder Insight" },
  { value: "decision_log", label: "Decision Log" },
  { value: "political_dynamic", label: "Political Dynamic" },
  { value: "meeting_debrief", label: "Meeting Debrief" },
  { value: "strategic_observation", label: "Strategic Observation" },
  { value: "competitive_insight", label: "Competitive Insight" },
  { value: "relationship_note", label: "Relationship Note" },
];

export const STAKEHOLDER_RELATIONSHIPS: {
  value: StakeholderRelationship;
  label: string;
  color: string;
}[] = [
  { value: "sponsor", label: "Sponsor", color: "#22c55e" },
  { value: "champion", label: "Champion", color: "#3b82f6" },
  { value: "supporter", label: "Supporter", color: "#06b6d4" },
  { value: "neutral", label: "Neutral", color: "#6b7280" },
  { value: "blocker", label: "Blocker", color: "#ef4444" },
  { value: "unknown", label: "Unknown", color: "#9ca3af" },
];

// --- Pipeline Stage Config ---

export const DEAL_STAGES: { value: DealStage; label: string; color: string }[] = [
  { value: "lead", label: "Lead", color: "#6b7280" },
  { value: "qualified", label: "Qualified", color: "#8b5cf6" },
  { value: "discovery", label: "Discovery", color: "#3b82f6" },
  { value: "demo_booked", label: "Demo Booked", color: "#14b8a6" },
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
  "demo_booked",
  "poc_trial",
  "proposal",
  "negotiation",
];

// --- SFDC Stage Mapping ---

export const SFDC_STAGE_MAP: Record<DealStage, string> = {
  lead: "Prospecting",
  qualified: "Qualification",
  discovery: "Needs Analysis",
  demo_booked: "Demo Scheduled",
  poc_trial: "Value Proposition",
  proposal: "Proposal/Price Quote",
  negotiation: "Negotiation/Review",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

// --- Daily Briefings ---

export interface DailyBriefing {
  briefing_id: string;
  user_id: string;
  briefing_date: string;
  content: string;
  edited_content: string | null;
  sources_cited: string[];
  tokens_used: number | null;
  generated_at: string;
  created_at: string;
  updated_at: string;
}

// --- Tradeshows ---

export type TradeshowStatus =
  | "draft"
  | "analyzing"
  | "partial"
  | "complete"
  | "error";

export type TradeshowPriority =
  | "priority_1_walk_up"
  | "priority_2_strong_conversation"
  | "priority_3_competitive_intel";

export type TargetResearchStatus =
  | "pending"
  | "researching"
  | "complete"
  | "error";

export interface Tradeshow {
  tradeshow_id: string;
  user_id: string;
  name: string;
  dates: string | null;
  location: string | null;
  sponsor_page_url: string | null;
  raw_html: string | null;
  status: TradeshowStatus;
  analysis_summary: string | null;
  total_sponsors: number;
  total_estimated_pipeline: number;
  tokens_used: number;
  analyzed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradeshowTarget {
  target_id: string;
  tradeshow_id: string;
  user_id: string;
  company: string;
  sponsorship_tier: string | null;
  company_description: string | null;
  icp_category: string | null;
  icp_fit_strength: string | null;
  estimated_acv: number | null;
  priority: TradeshowPriority | null;
  priority_rationale: string | null;
  pitch_angle: string | null;
  is_competitor: boolean;
  competitor_notes: string | null;
  bombora_angle: string | null;
  research_status: TargetResearchStatus;
  research_notes: string | null;
  existing_deal_id: string | null;
  existing_prospect_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TradeshowContact {
  contact_id: string;
  target_id: string;
  user_id: string;
  name: string;
  title: string | null;
  why_this_person: string | null;
  linkedin_url: string | null;
  approach_strategy: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const TRADESHOW_PRIORITIES: {
  value: TradeshowPriority;
  label: string;
  shortLabel: string;
  color: string;
  description: string;
}[] = [
  {
    value: "priority_1_walk_up",
    label: "Priority 1: Walk Up",
    shortLabel: "P1: Walk Up",
    color: "#22c55e",
    description: "High-value target. Walk up to their booth.",
  },
  {
    value: "priority_2_strong_conversation",
    label: "Priority 2: Strong Conversation",
    shortLabel: "P2: Strong Convo",
    color: "#3b82f6",
    description: "Good fit. Have a meaningful conversation if the opportunity arises.",
  },
  {
    value: "priority_3_competitive_intel",
    label: "Priority 3: Competitive Intel",
    shortLabel: "P3: Listen Only",
    color: "#6b7280",
    description: "Competitor or low-priority. Gather intel, don't pitch.",
  },
];

export const KNOWN_COMPETITORS = [
  "Intentsify",
  "Demand Science",
  "DemandScience",
  "Anteriad",
  "Bombora",
  "TechTarget",
  "ZoomInfo",
];

export const ICP_DEAL_SIZES: Record<string, { min: number; max: number; midpoint: number }> = {
  "ABM Platforms": { min: 200000, max: 500000, midpoint: 350000 },
  "Sales Intelligence": { min: 100000, max: 300000, midpoint: 200000 },
  "CRM/MAP Platforms": { min: 500000, max: 2000000, midpoint: 1250000 },
  "Ad Tech / DSPs": { min: 100000, max: 250000, midpoint: 175000 },
  "Data Enrichment": { min: 200000, max: 500000, midpoint: 350000 },
  "Content Syndication": { min: 100000, max: 200000, midpoint: 150000 },
  "Conversation Intelligence": { min: 100000, max: 200000, midpoint: 150000 },
  "Recruiting/HR Tech": { min: 100000, max: 300000, midpoint: 200000 },
  "Financial Services": { min: 200000, max: 500000, midpoint: 350000 },
};

// --- Flashcards ---

export type CardType = "standard" | "fill_blank" | "image";

export type MasteryLevel = "new" | "learning" | "reviewing" | "mastered";

export interface FlashcardDeck {
  deck_id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  card_count: number;
  mastery_pct: number;
  last_studied_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Flashcard {
  card_id: string;
  deck_id: string;
  user_id: string;
  card_type: CardType;
  front_content: string;
  back_content: string;
  back_detail: string | null;
  image_url: string | null;
  source_attribution: string | null;
  times_seen: number;
  times_correct: number;
  mastery: MasteryLevel;
  last_seen_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface QuizSession {
  session_id: string;
  deck_id: string;
  user_id: string;
  total_cards: number;
  first_pass_correct: number;
  final_correct: number;
  completed: boolean;
  started_at: string;
  completed_at: string | null;
}

export interface QuizResponse {
  response_id: string;
  session_id: string;
  card_id: string;
  user_id: string;
  attempt_number: number;
  is_correct: boolean;
  responded_at: string;
}

export const DECK_COLORS: { value: string; label: string; className: string }[] = [
  { value: "blue", label: "Blue", className: "bg-accent-primary/20 border-accent-primary/40" },
  { value: "green", label: "Green", className: "bg-status-green/20 border-status-green/40" },
  { value: "yellow", label: "Yellow", className: "bg-status-yellow/20 border-status-yellow/40" },
  { value: "red", label: "Red", className: "bg-status-red/20 border-status-red/40" },
  { value: "purple", label: "Purple", className: "bg-purple-500/20 border-purple-500/40" },
  { value: "gray", label: "Gray", className: "bg-surface-tertiary border-border-primary" },
];

export const MASTERY_THRESHOLDS = {
  learning: 0.5,
  reviewing: 0.7,
  mastered: 0.9,
  minSeen: 3,
} as const;

// --- M&A Entities ---

export type MaEntityType = "acquirer" | "target";

export type MaStage =
  | "identified"
  | "researching"
  | "outreach"
  | "conversations"
  | "diligence"
  | "negotiation"
  | "closed"
  | "passed"
  | "dead";

export type MaNoteType = "update" | "meeting" | "research" | "document" | "decision";

export interface MaEntity {
  entity_id: string;
  user_id: string;
  company: string;
  entity_type: MaEntityType;
  stage: MaStage;
  strategic_rationale: string | null;
  estimated_valuation: number | null;
  key_date: string | null;
  key_date_label: string | null;
  website: string | null;
  notes: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaContact {
  contact_id: string;
  entity_id: string;
  user_id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  role_in_process: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MaNote {
  note_id: string;
  entity_id: string;
  user_id: string;
  content: string;
  note_type: MaNoteType;
  created_at: string;
}

/** Entity with contact count for list view */
export interface MaEntityWithCounts extends MaEntity {
  contact_count?: number;
  note_count?: number;
}

export const MA_STAGES: { value: MaStage; label: string; color: string }[] = [
  { value: "identified", label: "Identified", color: "#6b7280" },
  { value: "researching", label: "Researching", color: "#8b5cf6" },
  { value: "outreach", label: "Outreach", color: "#3b82f6" },
  { value: "conversations", label: "Conversations", color: "#06b6d4" },
  { value: "diligence", label: "Diligence", color: "#eab308" },
  { value: "negotiation", label: "Negotiation", color: "#f97316" },
  { value: "closed", label: "Closed", color: "#22c55e" },
  { value: "passed", label: "Passed", color: "#9ca3af" },
  { value: "dead", label: "Dead", color: "#ef4444" },
];

export const MA_ACTIVE_STAGES: MaStage[] = [
  "identified",
  "researching",
  "outreach",
  "conversations",
  "diligence",
  "negotiation",
];

export const MA_ENTITY_TYPES: { value: MaEntityType; label: string; color: string }[] = [
  { value: "acquirer", label: "Acquirer", color: "#3b82f6" },
  { value: "target", label: "Target", color: "#8b5cf6" },
];

export const MA_NOTE_TYPES: { value: MaNoteType; label: string }[] = [
  { value: "update", label: "Update" },
  { value: "meeting", label: "Meeting" },
  { value: "research", label: "Research" },
  { value: "document", label: "Document" },
  { value: "decision", label: "Decision" },
];

// --- M&A Documents ---

export type MaDocumentAnalysisStatus = "pending" | "analyzing" | "complete" | "failed";

export interface MaDocument {
  document_id: string;
  entity_id: string;
  user_id: string;
  filename: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  analysis_status: MaDocumentAnalysisStatus;
  created_at: string;
}

/** MaDocument with a temporary signed download URL */
export interface MaDocumentWithUrl extends MaDocument {
  signed_url: string;
}

// --- Sidebar Folders ---

export interface SidebarFolder {
  folder_id: string;
  user_id: string;
  name: string;
  sort_order: number;
  is_open: boolean;
  created_at: string;
  updated_at: string;
}

export interface SidebarItemAssignment {
  id: string;
  user_id: string;
  nav_key: string;
  folder_id: string;
  sort_order: number;
  created_at: string;
}

// --- Revenue Math Constants ---

export const REVENUE_TARGET = 1_000_000;
export const BASE_SALARY = 225_000;
export const REV_SHARE_PERCENT = 0.25;
export const TARGET_ACV = 100_000;
export const TARGET_CUSTOMERS = 10;
