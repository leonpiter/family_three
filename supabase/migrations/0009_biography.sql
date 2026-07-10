-- Расширение биографии: образование, работа, достижения, места жизни, служба.
alter table public.persons
  add column education text,
  add column occupation text,   -- кем работал
  add column achievements text, -- достижения
  add column residence text,    -- где жил
  add column military_status text
    check (military_status in ('not_served', 'served', 'fought')),
  add column military_notes text; -- боевой путь (текст; в будущем — вложения)

-- Обновляем гард редактирования: новые био-поля тоже может менять только
-- автор карточки, сам человек или админ (не-автору — отказ).
create or replace function public.guard_person_edit()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then return new; end if;
  if public.is_admin() then return new; end if;
  if old.created_by = auth.uid() or old.user_id = auth.uid() then return new; end if;
  if new.first_name  is not distinct from old.first_name
     and new.middle_name is not distinct from old.middle_name
     and new.last_name   is not distinct from old.last_name
     and new.maiden_name is not distinct from old.maiden_name
     and new.gender      is not distinct from old.gender
     and new.birth_date  is not distinct from old.birth_date
     and new.death_date  is not distinct from old.death_date
     and new.birth_place is not distinct from old.birth_place
     and new.bio         is not distinct from old.bio
     and new.education      is not distinct from old.education
     and new.occupation     is not distinct from old.occupation
     and new.achievements   is not distinct from old.achievements
     and new.residence      is not distinct from old.residence
     and new.military_status is not distinct from old.military_status
     and new.military_notes  is not distinct from old.military_notes
     and new.user_id     is not distinct from old.user_id
     and new.created_by  is not distinct from old.created_by
  then
    return new;
  end if;
  raise exception 'Only author, the person themself or admin can edit this card';
end;
$$;
