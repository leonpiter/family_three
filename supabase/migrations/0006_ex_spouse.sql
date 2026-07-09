-- Пометка «бывшие супруги» на связи (развод/расставание).
alter table public.relationships add column is_ex boolean not null default false;
