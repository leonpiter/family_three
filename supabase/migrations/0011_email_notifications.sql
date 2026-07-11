-- Email-уведомления админам: новая заявка на регистрацию и новое замечание.
-- Письма шлёт Resend через pg_net прямо из триггера.
--
-- ВАЖНО: ключ Resend НЕ хранится в репозитории. Он лежит в Supabase Vault и
-- создаётся один раз вручную (в SQL Editor):
--   select vault.create_secret('re_xxx', 'resend_api_key', 'Resend API key');

create extension if not exists pg_net;

-- Общая отправка письма через Resend (ключ читается из Vault).
create or replace function public.send_email(
  recipients text[],
  subject text,
  html text
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  api_key text;
begin
  if recipients is null or array_length(recipients, 1) is null then return; end if;

  select decrypted_secret into api_key
    from vault.decrypted_secrets where name = 'resend_api_key';
  if api_key is null then return; end if;

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || api_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', 'Семейное древо <noreply@dualgate.ru>',
      'to', to_jsonb(recipients),
      'subject', subject,
      'html', html
    )
  );
end;
$$;

-- Email действующих админов
create or replace function public.admin_emails()
returns text[]
language sql stable security definer set search_path = public
as $$
  select array_agg(email)
    from public.profiles
   where role = 'admin' and status = 'approved' and email is not null;
$$;

-- 1. Новая заявка на регистрацию
create or replace function public.notify_new_signup()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status <> 'pending' then return new; end if;
  perform public.send_email(
    public.admin_emails(),
    'Новая заявка — Семейное древо',
    '<div style="font-family:system-ui,sans-serif;max-width:520px;">'
    || '<h2>🌳 Новая заявка на регистрацию</h2>'
    || '<p><b>' || coalesce(new.display_name, '—') || '</b><br>'
    || coalesce(new.email, '—') || '</p>'
    || '<p><a href="https://leonpiter.github.io/family_three/#/admin" '
    || 'style="background:#047857;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;display:inline-block;">'
    || 'Открыть заявки</a></p></div>'
  );
  return new;
end;
$$;

create trigger profiles_notify_new_signup
  after insert on public.profiles
  for each row execute function public.notify_new_signup();

-- 2. Новое замечание к карточке
create or replace function public.notify_new_edit_request()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  person_name text;
  author_name text;
begin
  select coalesce(first_name, '') || ' ' || coalesce(last_name, '')
    into person_name from public.persons where id = new.person_id;
  select display_name into author_name from public.profiles where id = new.author_id;

  perform public.send_email(
    public.admin_emails(),
    'Замечание к карточке — Семейное древо',
    '<div style="font-family:system-ui,sans-serif;max-width:520px;">'
    || '<h2>🌳 Новое замечание к карточке</h2>'
    || '<p>Карточка: <b>' || coalesce(person_name, '—') || '</b><br>'
    || 'От: ' || coalesce(author_name, '—') || '</p>'
    || '<blockquote style="border-left:4px solid #d97706;background:#fffbeb;padding:10px 14px;margin:0;">'
    || coalesce(new.message, '') || '</blockquote>'
    || '<p><a href="https://leonpiter.github.io/family_three/#/admin" '
    || 'style="background:#047857;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;display:inline-block;">'
    || 'Открыть замечания</a></p></div>'
  );
  return new;
end;
$$;

create trigger edit_requests_notify_new
  after insert on public.edit_requests
  for each row execute function public.notify_new_edit_request();
