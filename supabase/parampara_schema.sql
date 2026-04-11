-- Parampara Supabase schema (MVP)
-- NOTE: This is an MVP schema without Supabase Auth.
-- Production must add proper authentication + row-level security.

create extension if not exists "pgcrypto";

create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  parent_pin_hash text not null,
  created_at timestamptz not null default now(),
  last_active_at timestamptz
);

create table if not exists children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  kid_code text not null unique,
  nickname text not null,
  age integer not null check (age between 5 and 15),
  preferred_language text,
  created_at timestamptz not null default now(),
  last_active_at timestamptz,
  onboarding jsonb,
  level text not null default 'starter',
  progress_summary jsonb default jsonb_build_object(
    'totalMinutes', 0,
    'streakDays', 0,
    'lastStoryId', null,
    'lastGameId', null,
    'lastWritingAt', null
  ),
  session_token text
);

create index if not exists children_family_id_idx on children(family_id);
create index if not exists children_kid_code_idx on children(kid_code);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  type text not null,
  ts timestamptz not null default now(),
  metadata jsonb
);

create index if not exists events_child_id_idx on events(child_id);
create index if not exists events_type_idx on events(type);

create table if not exists mistakes (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  domain text not null,
  item text not null,
  count integer not null default 1,
  last_seen_at timestamptz,
  examples jsonb,
  unique (child_id, domain, item)
);

create index if not exists mistakes_child_id_idx on mistakes(child_id);

-- ─── session_results ──────────────────────────────────────────────────────────
-- Stores completed story+quiz session outcomes, powering the OutcomeDashboard
-- charts (accuracy over time, words per session, language distribution).
-- NOTE: The app also writes these to localStorage for offline support.
-- localStorage key: bbashabuddy_session_results_${child_id}

create table if not exists session_results (
  id                uuid        primary key default gen_random_uuid(),
  child_id          uuid        not null references children(id) on delete cascade,
  ts                timestamptz not null default now(),
  language          text        not null,
  genre             text        not null,
  words_in_story    integer     not null default 0,
  questions_total   integer     not null default 0,
  questions_answered integer    not null default 0,
  correct_count     integer     not null default 0,
  accuracy_pct      integer     not null default 0
    check (accuracy_pct between 0 and 100),
  -- Weak words that were injected into this session via adaptive difficulty
  weak_words_used   jsonb,
  -- Whether RAG cultural context was active
  rag_enabled       boolean     not null default true,
  metadata          jsonb
);

create index if not exists session_results_child_id_idx on session_results(child_id);
create index if not exists session_results_ts_idx on session_results(child_id, ts desc);

-- Row Level Security (MVP)
alter table families enable row level security;
alter table children enable row level security;
alter table events enable row level security;
alter table mistakes enable row level security;

-- MVP policy: open access for demo usage.
-- IMPORTANT: Replace with Supabase Auth + policies scoped to the authenticated user
-- (or use a secure session token + edge functions) before production.
create policy "mvp_allow_all_families" on families
  for all using (true) with check (true);

create policy "mvp_allow_all_children" on children
  for all using (true) with check (true);

create policy "mvp_allow_all_events" on events
  for all using (true) with check (true);

create policy "mvp_allow_all_mistakes" on mistakes
  for all using (true) with check (true);

alter table session_results enable row level security;
create policy "mvp_allow_all_session_results" on session_results
  for all using (true) with check (true);
