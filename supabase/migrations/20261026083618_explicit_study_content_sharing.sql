create table public.study_content_members (
 user_id uuid not null references auth.users(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 primary key (user_id, owner_id), check (user_id <> owner_id)
);
alter table public.study_content_members enable row level security;
revoke all on public.study_content_members from anon, authenticated;
grant select on public.study_content_members to authenticated;
create policy members_read_own on public.study_content_members for select to authenticated
 using (user_id = (select auth.uid()));
create policy reader_texts_read_shared on public.reader_texts for select to authenticated
 using (exists (select 1 from public.study_content_members m where m.user_id = (select auth.uid()) and m.owner_id = reader_texts.user_id));
create policy members_read_study_content on storage.objects for select to authenticated
 using (bucket_id = 'study-content' and exists (
 select 1 from public.study_content_members m where m.user_id = (select auth.uid())
 and m.owner_id = '703051a6-1db9-4d58-849b-0decce766e22'::uuid));
create policy members_read_story_backgrounds on storage.objects for select to authenticated
 using (bucket_id = 'story-backgrounds' and exists (
 select 1 from public.study_content_members m where m.user_id = (select auth.uid())
 and m.owner_id::text = (storage.foldername(name))[1]));
