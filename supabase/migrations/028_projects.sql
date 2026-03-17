-- Studio Projects: AI-assisted deliverable workspace (battlecards, proposals, etc.)
-- Distinct from `projects` table which tracks internal account/deal workstreams.

create type studio_project_type as enum (
  'battlecard',
  'one_pager',
  'proposal',
  'competitive_analysis',
  'contract_analysis',
  'freeform'
);

create type studio_project_status as enum (
  'draft',
  'in_progress',
  'complete'
);

create table studio_projects (
  project_id  uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  type        studio_project_type not null default 'freeform',
  status      studio_project_status not null default 'draft',
  description text,
  -- Structured output built up by the Strategist, array of sections
  -- Each section: { id, title, content, type: 'text'|'bullets'|'slide' }
  output_json jsonb not null default '[]'::jsonb,
  -- Linked coaching thread that powers the Strategist chat for this project
  thread_id   uuid references coaching_threads(thread_id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table studio_projects enable row level security;

create policy "studio_projects_all"
  on studio_projects for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create trigger studio_projects_updated_at
  before update on studio_projects
  for each row execute function update_updated_at();

create index studio_projects_user_idx on studio_projects(user_id, updated_at desc);
