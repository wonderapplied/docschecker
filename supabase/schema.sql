-- Unlocked schema. Run in the Supabase SQL editor.
--
-- Access model: the Next.js server talks to every table with the service role key and does its
-- own auth checks. The browser only ever reads `lobby_status` (numbers, no doc text) over
-- Realtime, using a short-lived JWT the server mints, so RLS decides which rows it sees.

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  google_sub text not null unique,
  email text,
  name text,
  avatar text,
  discord_id text,
  invite_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz not null default now()
);

-- One row per direction; accepting an invite inserts both.
create table if not exists friendships (
  user_id uuid not null references users(id) on delete cascade,
  friend_id uuid not null references users(id) on delete cascade,
  status text not null default 'accepted' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  doc_id text not null,
  doc_title text,
  show_title boolean not null default false,
  goal_words int check (goal_words > 0),
  goal_sentences int check (goal_sentences > 0),
  deadline timestamptz,
  baseline_words int not null,
  baseline_sentences int not null,
  -- Word frequencies at session start, so junk checks only look at what was added.
  baseline_freq jsonb not null default '{}',
  -- Words excluded by paste detection when PASTE_MODE=discount.
  discounted_words int not null default 0,
  last_words int not null,
  last_sentences int not null,
  last_polled_at timestamptz not null default now(),
  flags text[] not null default '{}',
  started_at timestamptz not null default now(),
  unlocked_at timestamptz,
  ended_at timestamptz,
  check (goal_words is not null or goal_sentences is not null)
);
create index if not exists sessions_user_active on sessions (user_id) where ended_at is null;

create table if not exists snapshots (
  id bigint generated always as identity primary key,
  session_id uuid not null references sessions(id) on delete cascade,
  words int not null,
  sentences int not null,
  flagged text,
  taken_at timestamptz not null default now()
);
create index if not exists snapshots_session on snapshots (session_id, taken_at);

-- What friends can see. Written only by the server.
create table if not exists lobby_status (
  user_id uuid primary key references users(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  name text,
  avatar text,
  doc_title text,
  words_added int not null default 0,
  sentences_added int not null default 0,
  goal_words int,
  goal_sentences int,
  percent int not null default 0,
  status text not null default 'idle' check (status in ('idle', 'writing', 'almost', 'unlocked')),
  flags text[] not null default '{}',
  deadline timestamptz,
  started_at timestamptz,
  unlocked_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table users enable row level security;
alter table friendships enable row level security;
alter table sessions enable row level security;
alter table snapshots enable row level security;
alter table lobby_status enable row level security;

-- No policies on the first four tables: only the service role can touch them.
grant select on lobby_status to authenticated;

-- security definer so the policy can read `friendships`, which the browser role can't.
create or replace function public.is_friend(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from friendships f
    where f.user_id = auth.uid() and f.friend_id = other and f.status = 'accepted'
  );
$$;
revoke all on function public.is_friend(uuid) from public;
grant execute on function public.is_friend(uuid) to authenticated;

drop policy if exists "see self and friends" on lobby_status;
create policy "see self and friends" on lobby_status
  for select to authenticated
  using (user_id = auth.uid() or public.is_friend(user_id));

-- Stream lobby changes to the browser.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'lobby_status'
  ) then
    alter publication supabase_realtime add table lobby_status;
  end if;
end $$;

-- v2: Discord connect, per-user ping channel, streaks, pings. Safe to re-run.
alter table users add column if not exists discord_username text;
alter table users add column if not exists discord_webhook_url text;
alter table lobby_status add column if not exists streak int not null default 0;
alter table lobby_status add column if not exists last_unlocked_at timestamptz;
alter table friendships add column if not exists last_pinged_at timestamptz;
