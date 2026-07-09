-- Фотографии персон, приватный bucket и аватар на карточке.

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.persons (id) on delete cascade,
  storage_path text not null,
  thumb_path text not null,
  caption text,
  uploaded_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Циклическая ссылка persons<->photos: колонка добавляется после создания photos.
alter table public.persons
  add column avatar_photo_id uuid references public.photos (id) on delete set null;

alter table public.photos enable row level security;

create policy "photos_select" on public.photos
  for select using (public.is_approved());
create policy "photos_insert" on public.photos
  for insert with check (public.is_approved() and uploaded_by = auth.uid());
create policy "photos_update" on public.photos
  for update using (public.is_approved()) with check (public.is_approved());
create policy "photos_delete" on public.photos
  for delete using (uploaded_by = auth.uid() or public.is_admin());

-- Приватный bucket: файлы доступны только по подписанным URL.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

create policy "photos_storage_select" on storage.objects
  for select using (bucket_id = 'photos' and public.is_approved());
create policy "photos_storage_insert" on storage.objects
  for insert with check (bucket_id = 'photos' and public.is_approved());
create policy "photos_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'photos' and (owner_id = (auth.uid())::text or public.is_admin())
  );
