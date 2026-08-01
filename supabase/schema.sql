-- Vincere Lexus CRM — Supabase schema for cross-device sync.
-- Run this once in your Supabase project: SQL Editor → New query → paste → Run.
--
-- Model: one JSON document per signed-in user holding that user's CRM overlay
-- (edited deals, appointments, ads, task state, logged messages, CSV inventory).
-- Row Level Security ties each row to its owner, so the public anon key in the
-- app can only ever read/write the signed-in user's own row.

create table if not exists public.crm_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.crm_state enable row level security;

-- each user can only see and change their own row
drop policy if exists "crm_state_select_own" on public.crm_state;
create policy "crm_state_select_own" on public.crm_state
  for select using (auth.uid() = user_id);

drop policy if exists "crm_state_insert_own" on public.crm_state;
create policy "crm_state_insert_own" on public.crm_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "crm_state_update_own" on public.crm_state;
create policy "crm_state_update_own" on public.crm_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- live updates across your devices (phone <-> laptop)
alter publication supabase_realtime add table public.crm_state;


-- ===========================================================================
-- Website leads: the public form on phildavemotors inserts here (anonymously);
-- only YOU (signed in) can read/convert/dismiss them.
-- ===========================================================================
create table if not exists public.leads (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status     text not null default 'new',   -- new | converted | dismissed
  source     text,
  name       text,
  phone      text,
  email      text,
  payload    jsonb not null default '{}'::jsonb   -- all raw form fields
);

alter table public.leads enable row level security;

-- the public website can drop in a lead, but read nothing
drop policy if exists "leads_anon_insert" on public.leads;
create policy "leads_anon_insert" on public.leads
  for insert to anon with check (true);

-- only the dealership owner can see / update / delete leads
--   >>> change this email if a different Google account owns the CRM <<<
drop policy if exists "leads_owner_read" on public.leads;
create policy "leads_owner_read" on public.leads
  for select to authenticated using (auth.jwt() ->> 'email' = 'pdg7857@gmail.com');

drop policy if exists "leads_owner_write" on public.leads;
create policy "leads_owner_write" on public.leads
  for update to authenticated using (auth.jwt() ->> 'email' = 'pdg7857@gmail.com');

drop policy if exists "leads_owner_delete" on public.leads;
create policy "leads_owner_delete" on public.leads
  for delete to authenticated using (auth.jwt() ->> 'email' = 'pdg7857@gmail.com');

alter publication supabase_realtime add table public.leads;

-- Optional: to require sign-in, keep the default email provider on
-- (Authentication → Providers → Email). The app uses email one-time codes,
-- so no redirect URLs need configuring.
