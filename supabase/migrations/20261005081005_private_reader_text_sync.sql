create table public.reader_texts (
 user_id uuid not null references auth.users(id) on delete cascade,
 book_id text not null,
 book_data jsonb,
 updated_at timestamptz not null,
 primary key (user_id, book_id),
 constraint reader_text_valid check (book_data is null or (
   book_data->>'id' = book_id and book_data->>'packId' = 'generated-stories'
   and coalesce(book_data->'library'->>'temporary', 'false') = 'false'
   and jsonb_typeof(book_data->'stories') = 'array'
 ))
);
alter table public.reader_texts enable row level security;
revoke all on public.reader_texts from anon;
grant select, insert, update on public.reader_texts to authenticated;
create policy reader_texts_select_own on public.reader_texts for select to authenticated using ((select auth.uid()) = user_id);
create policy reader_texts_insert_own on public.reader_texts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy reader_texts_update_own on public.reader_texts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create function public.preserve_reader_text_revision() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
 if old.book_data is null or (new.book_data is not null and new.updated_at <= old.updated_at) then
   return old;
 end if;
 return new;
end;
$$;
revoke all on function public.preserve_reader_text_revision() from public, anon, authenticated;
create trigger reader_text_revision before update on public.reader_texts for each row execute function public.preserve_reader_text_revision();
