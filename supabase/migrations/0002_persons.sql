-- Персоны (ноды древа) и связи между ними.

create type public.rel_type as enum ('parent', 'spouse');

create table public.persons (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text,
  maiden_name text,
  gender text check (gender in ('m', 'f')),
  birth_date date,
  death_date date,
  birth_place text,
  bio text,
  -- «Карточку ведёт этот аккаунт»; назначает админ на странице участников
  user_id uuid unique references public.profiles (id) on delete set null,
  pos_x double precision not null default 0,
  pos_y double precision not null default 0,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger persons_set_updated_at
  before update on public.persons
  for each row execute function public.set_updated_at();

-- Привязку карточки к аккаунту (user_id) меняет только админ;
-- прямой SQL из дашборда (auth.uid() is null) разрешён.
create or replace function public.guard_person_user_link()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if old.user_id is distinct from new.user_id
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only admin can link person to user';
  end if;
  return new;
end;
$$;

create trigger persons_guard_user_link
  before update on public.persons
  for each row execute function public.guard_person_user_link();

alter table public.persons enable row level security;

create policy "persons_select" on public.persons
  for select using (public.is_approved());
create policy "persons_insert" on public.persons
  for insert with check (public.is_approved());
create policy "persons_update" on public.persons
  for update using (public.is_approved()) with check (public.is_approved());
create policy "persons_delete" on public.persons
  for delete using (public.is_admin());

-- Связи: parent — ребро ОТ родителя К ребёнку; spouse — пара супругов.
create table public.relationships (
  id uuid primary key default gen_random_uuid(),
  from_person_id uuid not null references public.persons (id) on delete cascade,
  to_person_id uuid not null references public.persons (id) on delete cascade,
  type public.rel_type not null,
  created_at timestamptz not null default now(),
  check (from_person_id <> to_person_id),
  unique (from_person_id, to_person_id, type)
);

-- Пара супругов уникальна независимо от направления
-- (клиент дополнительно нормализует порядок: меньший uuid — в from).
create unique index relationships_spouse_unique
  on public.relationships (
    least(from_person_id, to_person_id),
    greatest(from_person_id, to_person_id)
  )
  where type = 'spouse';

alter table public.relationships enable row level security;

create policy "relationships_select" on public.relationships
  for select using (public.is_approved());
create policy "relationships_insert" on public.relationships
  for insert with check (public.is_approved());
create policy "relationships_update" on public.relationships
  for update using (public.is_approved()) with check (public.is_approved());
create policy "relationships_delete" on public.relationships
  for delete using (public.is_approved());
