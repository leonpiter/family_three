-- Права на редактирование карточек + замечания («написать админу»).

-- 1. Замечания к карточке: видят все одобренные, закрыть может админ,
-- автор карточки, сам человек или автор замечания.
create table public.edit_requests (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.persons (id) on delete cascade,
  author_id uuid default auth.uid() references public.profiles (id) on delete set null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'done')),
  created_at timestamptz not null default now()
);

alter table public.edit_requests enable row level security;

create policy "edit_requests_select" on public.edit_requests
  for select using (public.is_approved());

create policy "edit_requests_insert" on public.edit_requests
  for insert with check (public.is_approved() and author_id = auth.uid());

create policy "edit_requests_update" on public.edit_requests
  for update using (
    public.is_admin()
    or author_id = auth.uid()
    or exists (
      select 1 from public.persons p
      where p.id = person_id
        and (p.created_by = auth.uid() or p.user_id = auth.uid())
    )
  );

create policy "edit_requests_delete" on public.edit_requests
  for delete using (public.is_admin() or author_id = auth.uid());

-- 2. Гард редактирования персон: биографические поля меняет только
-- автор записи (created_by), сам человек (user_id) или админ.
-- Позицию на доске (pos_x/pos_y) и аватар может менять любой одобренный —
-- доска общая, фото добавляют всей семьёй.
create or replace function public.guard_person_edit()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then return new; end if; -- прямой SQL из дашборда
  if public.is_admin() then return new; end if;
  if old.created_by = auth.uid() or old.user_id = auth.uid() then return new; end if;
  -- не автор: разрешены только pos_x/pos_y/avatar_photo_id
  if new.first_name  is not distinct from old.first_name
     and new.middle_name is not distinct from old.middle_name
     and new.last_name   is not distinct from old.last_name
     and new.maiden_name is not distinct from old.maiden_name
     and new.gender      is not distinct from old.gender
     and new.birth_date  is not distinct from old.birth_date
     and new.death_date  is not distinct from old.death_date
     and new.birth_place is not distinct from old.birth_place
     and new.bio         is not distinct from old.bio
     and new.user_id     is not distinct from old.user_id
     and new.created_by  is not distinct from old.created_by
  then
    return new;
  end if;
  raise exception 'Only author, the person themself or admin can edit this card';
end;
$$;

create trigger persons_guard_edit
  before update on public.persons
  for each row execute function public.guard_person_edit();
