-- Shared state for daas-framework.html and matrix.html
-- Single-row table keyed by id = 'default'
create table if not exists public.daas_framework_state (
  id text primary key default 'default',
  checks jsonb not null default '{}',
  acvs jsonb not null default '{}',
  leads jsonb not null default '{}',
  intros jsonb not null default '{}',
  stages jsonb not null default '{}',
  decisions jsonb not null default '{}',
  cpl_values jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Seed the default row
insert into public.daas_framework_state (id)
values ('default')
on conflict (id) do nothing;

-- Enable realtime so both pages can live-sync
alter publication supabase_realtime add table public.daas_framework_state;

-- RLS: public read, authenticated write (these are internal tools)
alter table public.daas_framework_state enable row level security;

create policy "Public read daas_framework_state"
  on public.daas_framework_state for select
  using (true);

create policy "Authenticated write daas_framework_state"
  on public.daas_framework_state for all
  using (true)
  with check (true);
