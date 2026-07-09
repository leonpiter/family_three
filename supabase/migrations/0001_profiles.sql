-- Профили пользователей: статусы одобрения, роли, хелперы безопасности.
-- Фундамент всей модели доступа: pending-пользователь не видит данных семьи.

create type public.profile_status as enum ('pending', 'approved', 'rejected');
create type public.profile_role as enum ('member', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text not null default '',
  status public.profile_status not null default 'pending',
  role public.profile_role not null default 'member',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- SECURITY DEFINER-хелперы: политики на profiles не могут сами читать profiles
-- (рекурсия RLS), поэтому проверка статуса вынесена в функции.
create or replace function public.is_approved()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and status = 'approved'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and status = 'approved' and role = 'admin'
  );
$$;

-- Профиль создаётся автоматически при регистрации в auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS в Postgres построчный: UPDATE-политика не запрещает менять отдельные
-- колонки, поэтому status/role защищены триггером — менять может только админ.
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (old.status is distinct from new.status
      or old.role is distinct from new.role)
     and not public.is_admin() then
    raise exception 'Only admin can change status or role';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- Политики: свой профиль виден всегда (pending должен видеть свой статус),
-- остальные — только одобренным членам семьи.
create policy "profiles_select" on public.profiles
  for select using (id = auth.uid() or public.is_approved());

create policy "profiles_update" on public.profiles
  for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy "profiles_delete" on public.profiles
  for delete using (public.is_admin());
