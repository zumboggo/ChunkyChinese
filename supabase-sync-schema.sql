create table if not exists public.word_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id text not null,
  word_data jsonb not null,
  updated_at timestamptz not null,
  user_edited_at timestamptz,
  primary key (user_id, word_id)
);

create table if not exists public.review_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null,
  event_data jsonb not null,
  "timestamp" timestamptz not null,
  primary key (user_id, event_id)
);

create table if not exists public.reader_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  progress_id text not null,
  progress_data jsonb not null,
  updated_at timestamptz not null,
  primary key (user_id, progress_id)
);

create table if not exists public.ai_story_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  model text not null,
  prompt text not null,
  created_at timestamptz not null default now()
);

alter table public.word_progress enable row level security;
alter table public.review_events enable row level security;
alter table public.reader_progress enable row level security;
alter table public.ai_story_generations enable row level security;

drop policy if exists "Users can read their own word progress" on public.word_progress;
create policy "Users can read their own word progress"
on public.word_progress for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own word progress" on public.word_progress;
create policy "Users can insert their own word progress"
on public.word_progress for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own word progress" on public.word_progress;
create policy "Users can update their own word progress"
on public.word_progress for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read their own review events" on public.review_events;
create policy "Users can read their own review events"
on public.review_events for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own review events" on public.review_events;
create policy "Users can insert their own review events"
on public.review_events for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own review events" on public.review_events;
create policy "Users can update their own review events"
on public.review_events for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read their own reader progress" on public.reader_progress;
create policy "Users can read their own reader progress"
on public.reader_progress for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own reader progress" on public.reader_progress;
create policy "Users can insert their own reader progress"
on public.reader_progress for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own reader progress" on public.reader_progress;
create policy "Users can update their own reader progress"
on public.reader_progress for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

revoke all on table public.word_progress from anon, authenticated;
revoke all on table public.review_events from anon, authenticated;
revoke all on table public.reader_progress from anon, authenticated;
revoke all on table public.ai_story_generations from anon, authenticated;

grant select, insert, update on table public.word_progress to authenticated;
grant select, insert, update on table public.review_events to authenticated;
grant select, insert, update on table public.reader_progress to authenticated;

-- AI prompts are used only for server-side rate limiting and are not exposed
-- through the browser Data API.
drop policy if exists "Users can read their own AI story generation events"
on public.ai_story_generations;
