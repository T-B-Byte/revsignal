// RevSignal Database Types
// These match the Supabase schema exactly.

export type DealStage =
  | "conversation"
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

export type FitScore = "strong" | "moderate" | "weak" | "not_a_fit";

export type ProspectStatus = "active" | "passed" | "converted";

export interface SuggestedContact {
  title: string;
  why_they_care: string;
  approach: string;
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
  fit_score: FitScore | null;
  fit_analysis: string | null;
  suggested_contacts: SuggestedContact[];
  next_action: string | null;
  outreach_date: string | null;
  status: ProspectStatus;
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

export interface ThreadParticipant {
  name: string;
  role?: string;
  company?: string;
  contact_id?: string;
}

export interface CoachingThread {
  thread_id: string;
  user_id: string;
  deal_id: string | null;
  ma_entity_id: string | null;
  prospect_id: string | null;
  meeting_note_id: string | null;
  project_id: string | null;
  title: string;
  contact_name: string | null;
  contact_role: string | null;
  company: string | null;
  contact_id: string | null;
  participants: ThreadParticipant[];
  thread_brief: string | null;
  brief_updated_at: string | null;
  catchup_text: string | null;
  catchup_generated_at: string | null;
  prospect_use_case: string | null;
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

export type TaskOwner = "me" | "them";
export type TaskSource = "manual" | "strategist" | "action_item";

export interface UserTask {
  task_id: string;
  user_id: string;
  description: string;
  due_date: string | null;
  status: "open" | "done";
  deal_id: string | null;
  thread_id: string | null;
  contact_id: string | null;
  owner: TaskOwner;
  source: TaskSource;
  escalation_level: EscalationLevel;
  source_message_id: string | null;
  source_text: string | null;
  created_at: string;
  completed_at: string | null;
}

/** UserTask with joined deal info for display */
export interface UserTaskWithDeal extends UserTask {
  deals?: Pick<Deal, "deal_id" | "company" | "stage"> | null;
  coaching_threads?: Pick<CoachingThread, "thread_id" | "title"> | null;
}

/** Thread with joined deal/M&A/contact info for sidebar display */
export interface CoachingThreadWithDeal extends CoachingThread {
  deals?: (Pick<Deal, "deal_id" | "company" | "stage"> & { acv?: number | null }) | null;
  ma_entities?: Pick<MaEntity, "entity_id" | "company" | "entity_type" | "stage"> | null;
  projects?: Pick<Project, "project_id" | "name" | "status" | "category"> | null;
  contacts?: Pick<Contact, "contact_id" | "name" | "company" | "role"> | null;
  open_follow_up_count?: number;
  has_overdue?: boolean;
  open_task_count?: number;
}

export type TalkingPointSource = "manual" | "strategist";

export interface TalkingPoint {
  id: string;
  user_id: string;
  contact_id: string;
  thread_id: string | null;
  content: string;
  priority: number;
  source: TalkingPointSource;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface TalkingPointWithThread extends TalkingPoint {
  coaching_threads?: Pick<CoachingThread, "thread_id" | "title"> | null;
}

export type PlanPhase = "day_30" | "day_60" | "day_90";

export interface Plan {
  plan_id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_date: string;
  thread_id: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanWithThread extends Plan {
  coaching_threads?: Pick<CoachingThread, "thread_id" | "title"> | null;
}

export interface PlanMilestone {
  milestone_id: string;
  plan_id: string;
  user_id: string;
  phase: PlanPhase;
  title: string;
  description: string | null;
  sort_order: number;
  is_completed: boolean;
  completed_at: string | null;
  thread_id: string | null;
  created_at: string;
}

export interface PlanMilestoneWithThread extends PlanMilestone {
  coaching_threads?: Pick<CoachingThread, "thread_id" | "title"> | null;
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
  { value: "conversation", label: "Conversation", color: "#94a3b8" },
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
  "conversation",
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
  conversation: "Initial Contact",
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

// --- Projects (Network Mindmap) ---

export type ProjectStatus = "active" | "paused" | "completed";

export interface Project {
  project_id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  color: string;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  member_id: string;
  project_id: string;
  user_id: string;
  contact_id: string | null;
  name: string;
  role: string | null;
  created_at: string;
}

export interface ProjectWithMembers extends Project {
  project_members: ProjectMember[];
}

export interface ProjectLinkedThread {
  thread_id: string;
  title: string;
  thread_brief: string | null;
  catchup_text: string | null;
  last_message_at: string;
  message_count: number;
}

export interface ProjectWithMembersAndThreads extends ProjectWithMembers {
  linked_threads?: ProjectLinkedThread[];
}

export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
];

export const PROJECT_COLORS: string[] = [
  "#3b82f6", "#22c55e", "#eab308", "#f97316", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6", "#6b7280",
];

// --- Competitor Comparisons ---

export interface CompetitorComparison {
  id: string;
  user_id: string;
  competitor: string;
  pricing: string | null;
  revenue: string | null;
  valuation: string | null;
  weakness: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// --- DaaS Use Cases (Contracts) ---

export type UseCaseStatus = "draft" | "review" | "final" | "attached";

export type DeliveryMethodUC = "api" | "flat_file" | "sftp" | "cloud_delivery";

export type AccessTier = "display_only" | "crm_append" | "bulk_export";

export type OverageModel = "per_query" | "hard_shutoff";

export interface WorkflowStep {
  step_number: number;
  description: string;
}

export interface DaasUseCase {
  use_case_id: string;
  user_id: string;
  deal_id: string | null;
  customer_name: string;
  status: UseCaseStatus;
  delivery_method: DeliveryMethodUC | null;
  access_tier: AccessTier | null;
  licensed_fields: string[];
  permitted_workflows: WorkflowStep[];
  caching_permitted: boolean;
  cache_ttl_days: number | null;
  end_user_access: boolean;
  end_user_can_export: boolean;
  anti_competitive_clause: boolean;
  custom_restrictions: string | null;
  volume_annual_minimum: number | null;
  volume_monthly_queries: number | null;
  overage_model: OverageModel | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** With joined deal info for list views */
export interface DaasUseCaseWithDeal extends DaasUseCase {
  deals?: Pick<Deal, "deal_id" | "company" | "stage" | "acv"> | null;
}

/** pharosIQ B2B contact data schema fields available for licensing */
export const DAAS_LICENSED_FIELDS = [
  // Company Identity
  { key: "company_id", label: "Company ID", group: "Company Identity", description: "Unique pharosIQ company identifier" },
  { key: "company_name", label: "Company Name", group: "Company Identity", description: "Legal or commonly known company name" },
  { key: "company_website", label: "Company Website", group: "Company Identity", description: "Primary company website URL" },
  { key: "company_linkedin_url", label: "Company LinkedIn URL", group: "Company Identity", description: "LinkedIn company page URL" },
  { key: "email_domain_id", label: "Email Domain ID", group: "Company Identity", description: "Primary email domain identifier" },
  // Location
  { key: "city", label: "City", group: "Location", description: "Company headquarters city" },
  { key: "state_province", label: "State / Province", group: "Location", description: "Company headquarters state or province" },
  { key: "country_iso2", label: "Country (ISO2)", group: "Location", description: "Two-letter ISO country code" },
  // Firmographics
  { key: "employee_size_name", label: "Employee Size Range", group: "Firmographics", description: "Categorical employee count range (e.g., 51-200)" },
  { key: "employee_total", label: "Employee Total", group: "Firmographics", description: "Exact employee count" },
  { key: "industry_name", label: "Industry Name", group: "Firmographics", description: "Primary industry classification" },
  { key: "linkedin_industry_id", label: "LinkedIn Industry ID", group: "Firmographics", description: "LinkedIn industry taxonomy identifier" },
  // Financial
  { key: "revenue_range", label: "Revenue Range", group: "Financial", description: "Categorical revenue band" },
  { key: "revenue_total", label: "Revenue Total", group: "Financial", description: "Estimated annual revenue figure" },
  // Classification
  { key: "naics_code", label: "NAICS Code", group: "Classification", description: "6-digit NAICS industry classification code" },
  { key: "naics_description", label: "NAICS Description", group: "Classification", description: "Human-readable NAICS classification" },
  { key: "is_domain_primary_company_id", label: "Primary Domain Flag", group: "Classification", description: "Whether this is the primary company for the email domain" },
] as const;

export type DaasFieldKey = typeof DAAS_LICENSED_FIELDS[number]["key"];

export const DAAS_FIELD_GROUPS = ["Company Identity", "Location", "Firmographics", "Financial", "Classification"] as const;

export const ACCESS_TIER_OPTIONS: { value: AccessTier; label: string; description: string }[] = [
  {
    value: "display_only",
    label: "Display Only",
    description: "End users can view pharosIQ data inside the customer's platform. No export, no CRM sync, no local storage.",
  },
  {
    value: "crm_append",
    label: "CRM Append / Export",
    description: "End users can push records into their own CRM or download individual records. No bulk export, no redistribution.",
  },
  {
    value: "bulk_export",
    label: "Bulk Export / Flat File",
    description: "End users can export large datasets. Highest risk tier: requires caching terms, destruction obligations, and audit rights.",
  },
];

export const DELIVERY_METHOD_UC_OPTIONS: { value: DeliveryMethodUC; label: string; description: string }[] = [
  { value: "api", label: "API", description: "Real-time queries against pharosIQ endpoints. Volume measured in queries per month." },
  { value: "flat_file", label: "Flat File", description: "Scheduled file delivery (CSV/JSON). Volume measured in records per delivery." },
  { value: "sftp", label: "SFTP", description: "Automated file transfer to customer-managed server." },
  { value: "cloud_delivery", label: "Cloud Delivery", description: "Shared storage (S3, GCS, Snowflake). Volume measured in records per refresh." },
];

export const OVERAGE_MODEL_OPTIONS: { value: OverageModel; label: string; description: string }[] = [
  { value: "per_query", label: "Cost Per Query", description: "Customer pays an agreed rate for each query past the monthly threshold." },
  { value: "hard_shutoff", label: "Hard Shutoff", description: "API returns 429 when threshold is reached. Customer must wait for next billing cycle or purchase additional queries." },
];

export const USE_CASE_STATUSES: { value: UseCaseStatus; label: string; color: string }[] = [
  { value: "draft", label: "Draft", color: "#6b7280" },
  { value: "review", label: "In Review", color: "#eab308" },
  { value: "final", label: "Final", color: "#3b82f6" },
  { value: "attached", label: "Attached to Deal", color: "#22c55e" },
];

/** Common intended use workflow templates */
export const WORKFLOW_TEMPLATES: { name: string; steps: WorkflowStep[] }[] = [
  {
    name: "API Enrichment (Display Only)",
    steps: [
      { step_number: 1, description: "Customer's application sends a query to pharosIQ API with a company identifier (domain, name, or company_id)." },
      { step_number: 2, description: "pharosIQ API returns the licensed data fields for the matched company record." },
      { step_number: 3, description: "Customer displays the returned data within their platform UI to their authenticated end users." },
      { step_number: 4, description: "No caching, local storage, or export of the returned data is permitted." },
    ],
  },
  {
    name: "API Enrichment (CRM Append)",
    steps: [
      { step_number: 1, description: "Customer's application sends a query to pharosIQ API with a company identifier (domain, name, or company_id)." },
      { step_number: 2, description: "pharosIQ API returns the licensed data fields for the matched company record." },
      { step_number: 3, description: "Customer displays the returned data within their platform UI to their authenticated end users." },
      { step_number: 4, description: "End users may append returned records to their own CRM or internal systems for operational use." },
      { step_number: 5, description: "Appended records are subject to the Caching Addendum TTL and must be refreshed or destroyed per the agreed schedule." },
      { step_number: 6, description: "End users may not redistribute, sublicense, or share appended records with any third party." },
    ],
  },
  {
    name: "Flat File / Bulk Delivery",
    steps: [
      { step_number: 1, description: "pharosIQ delivers a flat file (CSV/JSON) containing the licensed data fields on the agreed schedule (weekly/monthly)." },
      { step_number: 2, description: "Customer ingests the file into their internal data infrastructure." },
      { step_number: 3, description: "Customer uses the data to power features within their platform for authenticated end users." },
      { step_number: 4, description: "Previous file deliveries must be destroyed within the TTL defined in the Caching Addendum." },
      { step_number: 5, description: "Customer provides monthly usage reports to pharosIQ detailing record counts accessed." },
    ],
  },
  {
    name: "Embedded OEM (White Label)",
    steps: [
      { step_number: 1, description: "Customer integrates pharosIQ data into their product via API or bulk delivery." },
      { step_number: 2, description: "Customer's product displays pharosIQ data to end users under Customer's own brand (no pharosIQ attribution required unless negotiated)." },
      { step_number: 3, description: "End users may interact with the data within Customer's product (search, filter, view, export per the Access Tier)." },
      { step_number: 4, description: "Customer is contractually required to bind all end users to restrictions equivalent to this Intended Use exhibit." },
      { step_number: 5, description: "Customer is liable for any end-user breach of the passthrough restrictions." },
      { step_number: 6, description: "Customer may not position pharosIQ data as a standalone data product separate from their core platform." },
    ],
  },
];

// --- Revenue Math Constants ---

export const REVENUE_TARGET = 1_000_000;
export const BASE_SALARY = 225_000;
export const REV_SHARE_PERCENT = 0.25;
export const TARGET_ACV = 100_000;
export const TARGET_CUSTOMERS = 10;

// ============================================================
// GTM COMMAND CENTER & DEAL ROOMS
// ============================================================

export type GtmProductCategory =
  | "data_feeds"
  | "intelligence_reports"
  | "monitoring"
  | "data_products"
  | "platform";

export type DealRoomStatus = "draft" | "active" | "expired" | "archived";

export type QuoteStatus = "draft" | "submitted" | "reviewed" | "accepted" | "declined";

export type CompanyTier = "tier_1" | "tier_2" | "tier_3" | "tier_4" | "tier_5";

export type FitStrength = "strong" | "moderate" | "exploratory";

export type DataTestScope = "personas_intent" | "full_schema";

export type DataTestStatus =
  | "pending_upload"
  | "domains_uploaded"
  | "pending_approval"
  | "processing"
  | "completed"
  | "expired"
  | "denied";

export type DemoType =
  | "title_expansion"
  | "icp_analyzer"
  | "surge_dossier"
  | "audience_dashboard"
  | "closed_won_analyzer"
  | "daas_framework";

// --- GTM Product ---

export interface KeyStat {
  stat: string;
  source?: string;
}

export interface ProductFeature {
  name: string;
  description: string;
}

export interface ProductBenefit {
  benefit: string;
  for_whom?: string;
}

export interface ProductUseCase {
  title: string;
  description: string;
  persona?: string;
}

export interface ProductDifferentiator {
  vs_competitor: string;
  advantage: string;
}

export interface LinkedInPost {
  title: string;
  body: string;
  hashtags?: string[];
}

export interface OutreachSequence {
  target_type: string;
  emails: { subject: string; body: string }[];
}

export interface BattleCard {
  competitor: string;
  strengths: string[];
  weaknesses: string[];
  our_advantage: string;
}

export interface TargetPersona {
  tier: string;
  persona: string;
  why_they_buy: string;
}

export interface GtmProduct {
  product_id: string;
  user_id: string;
  slug: string;
  name: string;
  category: GtmProductCategory;
  tagline: string | null;
  value_prop: string | null;
  problem_statement: string | null;
  key_stats: KeyStat[];
  features: ProductFeature[];
  benefits: ProductBenefit[];
  use_cases: ProductUseCase[];
  differentiators: ProductDifferentiator[];
  pricing_tiers: Record<string, { price: string; unit: string; description: string }>;
  packaging_notes: string | null;
  linkedin_posts: LinkedInPost[];
  outreach_sequences: OutreachSequence[];
  battle_cards: BattleCard[];
  target_personas: TargetPersona[];
  demo_type: DemoType | null;
  demo_config: Record<string, unknown>;
  api_schema: Record<string, unknown>;
  data_dictionary: { field: string; type: string; description: string }[];
  sample_output: Record<string, unknown>;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// --- GTM Company Profile ---

export interface CompanyContact {
  name: string;
  title: string;
  linkedin?: string;
  email?: string;
  why_this_person?: string;
}

export interface OutreachRecord {
  date: string;
  channel: string;
  subject: string;
  outcome?: string;
}

export interface GtmCompanyProfile {
  company_id: string;
  user_id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  hq_location: string | null;
  employee_count: string | null;
  annual_revenue: string | null;
  website: string | null;
  linkedin_url: string | null;
  why_they_need_us: string | null;
  recent_news: string | null;
  company_tier: CompanyTier;
  contacts: CompanyContact[];
  deal_id: string | null;
  prospect_id: string | null;
  past_outreach: OutreachRecord[];
  notes: string | null;
  tags: string[];
  is_active: boolean;
  last_researched: string | null;
  created_at: string;
  updated_at: string;
}

// --- GTM Product Recommendation ---

export interface GtmProductRecommendation {
  recommendation_id: string;
  user_id: string;
  company_id: string;
  product_id: string;
  fit_strength: FitStrength;
  custom_angle: string | null;
  suggested_tier: string | null;
  suggested_use_cases: { title: string; description: string }[];
  include_in_deal_room: boolean;
  display_order: number;
  custom_features: Record<string, unknown> | null;
  custom_pricing: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Recommendation with joined product data for display */
export interface GtmRecommendationWithProduct extends GtmProductRecommendation {
  gtm_products?: Pick<GtmProduct, "product_id" | "name" | "slug" | "category" | "tagline" | "demo_type"> | null;
}

// --- Deal Room ---

export interface DealRoomProductSelection {
  product_id: string;
  display_order: number;
  custom_notes?: string;
}

export interface DealRoomCustomPricing {
  label: string;
  price: string;
  unit: string;
  description: string;
}

export interface DealRoomCustomUseCase {
  title: string;
  description: string;
  persona?: string;
}

export interface DealRoomCustomWhyUs {
  title: string;
  description: string;
}

export interface DealRoomDemoSelection {
  demo_type: DemoType;
  config?: Record<string, unknown>;
}

export interface DealRoom {
  room_id: string;
  user_id: string;
  company_id: string;
  slug: string;
  password_hash: string;
  password_plain: string | null;
  status: DealRoomStatus;
  expires_at: string | null;
  custom_header: string | null;
  welcome_message: string | null;
  selected_products: DealRoomProductSelection[];
  selected_demos: DealRoomDemoSelection[];
  show_audience_dashboard: boolean;
  audience_dashboard_url: string | null;
  show_quote_builder: boolean;
  custom_pricing: DealRoomCustomPricing[];
  custom_use_cases: DealRoomCustomUseCase[];
  custom_use_cases_intro: string | null;
  custom_why_us: DealRoomCustomWhyUs[];
  company_logo_url: string | null;
  accent_color: string | null;
  view_count: number;
  last_viewed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Deal room with joined company data */
export interface DealRoomWithCompany extends DealRoom {
  gtm_company_profiles?: Pick<GtmCompanyProfile, "company_id" | "name" | "slug" | "logo_url"> | null;
}

// --- Deal Room Quote ---

export interface QuoteLineItem {
  product_id: string;
  product_name: string;
  tier: string;
  quantity?: number;
  unit_price: number;
  subtotal: number;
  notes?: string;
}

export interface DealRoomQuote {
  quote_id: string;
  room_id: string;
  user_id: string;
  company_id: string;
  selected_items: QuoteLineItem[];
  total_price: number | null;
  currency: string;
  prospect_name: string | null;
  prospect_email: string | null;
  prospect_title: string | null;
  prospect_notes: string | null;
  status: QuoteStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  tina_notified: boolean;
  tina_notified_at: string | null;
  calendar_link_shown: boolean;
  created_at: string;
  updated_at: string;
}

// --- Data Test ---

export interface DealRoomDataTest {
  test_id: string;
  room_id: string;
  user_id: string;
  company_id: string;
  scope: DataTestScope;
  status: DataTestStatus;
  uploaded_domains: string[];
  domain_count: number;
  approval_requested_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  denial_reason: string | null;
  results: Record<string, unknown> | null;
  match_count: number | null;
  match_rate: number | null;
  prospect_name: string | null;
  prospect_email: string | null;
  prospect_company: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// --- Deal Room Access Log ---

export interface DealRoomAccessLog {
  log_id: string;
  room_id: string;
  accessed_at: string;
  ip_address: string | null;
  user_agent: string | null;
  pages_viewed: string[];
  duration_seconds: number | null;
}

// --- GTM Constants ---

export const GTM_PRODUCT_CATEGORIES: { value: GtmProductCategory; label: string }[] = [
  { value: "data_feeds", label: "Data Feeds" },
  { value: "intelligence_reports", label: "Intelligence Reports" },
  { value: "monitoring", label: "Monitoring" },
  { value: "data_products", label: "Data Products" },
  { value: "platform", label: "Platform" },
];

export const COMPANY_TIERS: { value: CompanyTier; label: string; description: string }[] = [
  { value: "tier_1", label: "Tier 1", description: "Strategic platform partners ($500K+ ACV)" },
  { value: "tier_2", label: "Tier 2", description: "High-value targets ($200-500K ACV)" },
  { value: "tier_3", label: "Tier 3", description: "Standard targets ($50-200K ACV)" },
  { value: "tier_4", label: "Tier 4", description: "Emerging / specialist ($25-50K ACV)" },
  { value: "tier_5", label: "Tier 5", description: "Exploratory / long-term" },
];

export const FIT_STRENGTHS: { value: FitStrength; label: string; color: string }[] = [
  { value: "strong", label: "Strong Fit", color: "#22c55e" },
  { value: "moderate", label: "Moderate Fit", color: "#f59e0b" },
  { value: "exploratory", label: "Exploratory", color: "#6b7280" },
];

export const DEAL_ROOM_STATUSES: { value: DealRoomStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "archived", label: "Archived" },
];

export const QUOTE_STATUSES: { value: QuoteStatus; label: string; color: string }[] = [
  { value: "draft", label: "Draft", color: "#6b7280" },
  { value: "submitted", label: "Submitted", color: "#3b82f6" },
  { value: "reviewed", label: "Reviewed", color: "#f59e0b" },
  { value: "accepted", label: "Accepted", color: "#22c55e" },
  { value: "declined", label: "Declined", color: "#ef4444" },
];

// ── Contradiction Detection ───────────────────────────────────────────

export type ContradictionSeverity = "low" | "medium" | "high";

export interface DealContradiction {
  contradiction_id: string;
  user_id: string;
  deal_id: string;
  thread_a_id: string | null;
  thread_b_id: string | null;
  description: string;
  category: string;
  severity: ContradictionSeverity;
  resolved: boolean;
  resolved_at: string | null;
  detected_at: string;
  created_at: string;
}

/** Contradiction with thread titles resolved for display. */
export interface DealContradictionWithThreads extends DealContradiction {
  thread_a_title: string | null;
  thread_b_title: string | null;
}

// ── Deal Insights (Karpathy Wiki Knowledge Pages) ──────────────────────

export type InsightType =
  | "analysis"
  | "decision"
  | "objection_handling"
  | "timeline"
  | "pricing"
  | "competitive"
  | "stakeholder_map"
  | "risk_assessment";

export const INSIGHT_TYPE_LABELS: Record<InsightType, string> = {
  analysis: "Analysis",
  decision: "Decision",
  objection_handling: "Objection Handling",
  timeline: "Timeline",
  pricing: "Pricing",
  competitive: "Competitive",
  stakeholder_map: "Stakeholder Map",
  risk_assessment: "Risk Assessment",
};

export interface DealInsight {
  insight_id: string;
  user_id: string;
  deal_id: string | null;
  thread_id: string | null;
  source_message_id: string | null;
  title: string;
  content: string;
  insight_type: InsightType;
  superseded_by: string | null;
  is_active: boolean;
  created_at: string;
}

/** Insight with thread title resolved for display. */
export interface DealInsightWithThread extends DealInsight {
  thread_title: string | null;
}

/** Tina's calendar booking link for quote follow-ups */
export const TINA_CALENDAR_URL = "https://outlook.office.com/bookwithme/user/c3813fda06294b0d81253fd6a96f2eea@pharosiq.com/meetingtype/M30u5FcCmk63f4GAJWMCFw2?anonymous&ismsaljsauthenabled&ep=mlink";
