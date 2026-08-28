insert into storage.buckets (id, name, public, file_size_limit)
values ('study-content', 'study-content', false, 104857600)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit;

drop policy if exists "Owner can read private study content" on storage.objects;
create policy "Owner can read private study content"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'study-content'
  and (select auth.uid()) = '703051a6-1db9-4d58-849b-0decce766e22'::uuid
);
