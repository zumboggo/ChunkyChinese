create table public.reader_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text not null,
  session_data jsonb not null,
  updated_at timestamptz not null,
  primary key (user_id, session_id)
);

create index reader_sessions_user_updated_idx
  on public.reader_sessions (user_id, updated_at desc);

alter table public.reader_sessions enable row level security;

revoke all on table public.reader_sessions from anon, authenticated;
grant select, insert, update, delete on table public.reader_sessions to authenticated;

create policy "Users can read their own reader sessions"
on public.reader_sessions for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own reader sessions"
on public.reader_sessions for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own reader sessions"
on public.reader_sessions for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own reader sessions"
on public.reader_sessions for delete to authenticated
using ((select auth.uid()) = user_id);
