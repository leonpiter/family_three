-- Закрытие дыр, найденных аудитом: гарды на INSERT/UPDATE persons, edit_requests,
-- photos + ужесточение storage-политик. RLS-политики на INSERT/UPDATE не умеют
-- защищать отдельные колонки — поэтому BEFORE-триггеры.

-- 1. persons: не-админ не может при вставке подделать created_by или занять чужой
-- user_id (привязку карточки к аккаунту делает только админ через UPDATE).
create or replace function public.guard_person_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then return new; end if; -- прямой SQL из дашборда
  if public.is_admin() then return new; end if;
  new.created_by := auth.uid();      -- форсируем автора, спуфинг невозможен
  new.user_id := null;               -- привязку к аккаунту ставит только админ
  return new;
end;
$$;

create trigger persons_guard_insert
  before insert on public.persons
  for each row execute function public.guard_person_insert();

-- 2. edit_requests: обновлять можно только status; текст/автор/привязка заморожены.
alter policy "edit_requests_update" on public.edit_requests
  using (
    public.is_admin()
    or author_id = auth.uid()
    or exists (
      select 1 from public.persons p
      where p.id = person_id
        and (p.created_by = auth.uid() or p.user_id = auth.uid())
    )
  )
  with check (
    public.is_admin()
    or author_id = auth.uid()
    or exists (
      select 1 from public.persons p
      where p.id = person_id
        and (p.created_by = auth.uid() or p.user_id = auth.uid())
    )
  );

create or replace function public.guard_edit_request_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if new.person_id is distinct from old.person_id
     or new.author_id is distinct from old.author_id
     or new.message is distinct from old.message
     or new.created_at is distinct from old.created_at then
    raise exception 'Only status can be changed';
  end if;
  return new;
end;
$$;

create trigger edit_requests_guard_update
  before update on public.edit_requests
  for each row execute function public.guard_edit_request_update();

-- 3. photos: нельзя сменить владельца/путь на существующей строке.
alter policy "photos_update" on public.photos
  using (public.is_approved())
  with check (public.is_approved() and (uploaded_by = auth.uid() or public.is_admin()));

create or replace function public.guard_photo_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if new.storage_path is distinct from old.storage_path
     or new.thumb_path is distinct from old.thumb_path
     or new.uploaded_by is distinct from old.uploaded_by
     or new.person_id is distinct from old.person_id then
    raise exception 'Only caption can be changed';
  end if;
  return new;
end;
$$;

create trigger photos_guard_update
  before update on public.photos
  for each row execute function public.guard_photo_update();

-- 4. Storage: загрузка/удаление только в папку существующей персоны
-- (первый сегмент пути = person_id). Это не даёт писать по произвольным путям.
drop policy if exists "photos_storage_insert" on storage.objects;
create policy "photos_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'photos'
    and public.is_approved()
    and exists (
      select 1 from public.persons p
      where p.id = ((storage.foldername(name))[1])::uuid
    )
  );
