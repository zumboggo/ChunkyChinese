-- Keep browser roles on the smallest privilege set required by cloud sync.
-- RLS remains the row-level authorization boundary; these grants are an
-- additional defense if a policy is accidentally broadened in the future.

create table if not exists public.ai_story_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  model text not null,
  prompt text not null,
  created_at timestamptz not null default now()
);

alter table if exists public.word_progress enable row level security;
alter table if exists public.review_events enable row level security;
alter table if exists public.reader_progress enable row level security;
alter table if exists public.user_settings enable row level security;
alter table public.ai_story_generations enable row level security;
alter table if exists public.character_tts_usage enable row level security;

revoke all on table public.ai_story_generations from anon, authenticated;

do $$
begin
  if to_regclass('public.word_progress') is not null then
    revoke all on table public.word_progress from anon, authenticated;
    grant select, insert, update on table public.word_progress to authenticated;
  end if;
  if to_regclass('public.review_events') is not null then
    revoke all on table public.review_events from anon, authenticated;
    grant select, insert, update on table public.review_events to authenticated;
  end if;
  if to_regclass('public.reader_progress') is not null then
    revoke all on table public.reader_progress from anon, authenticated;
    grant select, insert, update on table public.reader_progress to authenticated;
  end if;
  if to_regclass('public.user_settings') is not null then
    revoke all on table public.user_settings from anon, authenticated;
    grant select, insert, update, delete on table public.user_settings to authenticated;
  end if;
  if to_regclass('public.character_tts_usage') is not null then
    revoke all on table public.character_tts_usage from anon, authenticated;
  end if;
end
$$;

-- Generation logs and voice quotas are server-only. Edge Functions use the
-- service role after independently validating the caller's JWT.
drop policy if exists "Users can read their own AI story generation events"
  on public.ai_story_generations;

do $$
begin
  if to_regprocedure('public.consume_character_tts_quota(uuid,integer)') is not null then
    revoke all on function public.consume_character_tts_quota(uuid, integer)
      from public, anon, authenticated;
    grant execute on function public.consume_character_tts_quota(uuid, integer)
      to service_role;
  end if;
  if to_regprocedure('public.refund_character_tts_quota(uuid)') is not null then
    revoke all on function public.refund_character_tts_quota(uuid)
      from public, anon, authenticated;
    grant execute on function public.refund_character_tts_quota(uuid)
      to service_role;
  end if;
end
$$;
