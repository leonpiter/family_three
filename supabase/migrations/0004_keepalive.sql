-- Таблица для cron-пинга из GitHub Actions: реальный запрос к PostgREST
-- засчитывается как активность и не даёт free-проекту Supabase заснуть.

create table public.keepalive (
  id int primary key,
  pinged_at timestamptz not null default now()
);

insert into public.keepalive (id) values (1);

alter table public.keepalive enable row level security;

create policy "keepalive_select_anyone" on public.keepalive
  for select using (true);
