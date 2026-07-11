# Семейное древо (family_three)

Веб-сервис семейного генеалогического древа: бесконечная доска с фото-нодами родственников (drag-n-drop, связи «родитель—ребёнок» и «супруги»), карточки людей с биографией и фотоальбомами. Регистрация открыта, доступ — после одобрения администратором.

- **Фронт:** React + Vite + TypeScript + React Flow, хостинг — GitHub Pages
- **Бэкенд:** Supabase (Auth, Postgres + RLS, Storage)
- **Прод:** https://leonpiter.github.io/family_three/

## Документация

- [Архитектура](docs/ARCHITECTURE.md) — стек, модель данных, RLS, деплой
- [Спринт-план](docs/SPRINT-PLAN.md) — 4 спринта с задачами, критериями приёмки и DoD

## Локальный запуск

Требуется Node.js ≥ 22.

```bash
npm install
cp .env.example .env.local   # и заполнить значениями из Supabase
npm run dev                  # http://localhost:5173
```

## Настройка Supabase (с нуля)

1. Создать бесплатный проект на [supabase.com](https://supabase.com) (регион любой, ближе — лучше, например `eu-central`).
2. **Ключи**: Project Settings → API Keys → скопировать `Project URL` и `Publishable key` в `.env.local`:
   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<publishable key>
   ```
3. **Схема БД**: применить SQL-файлы из `supabase/migrations/` **по порядку номеров**. Два способа:
   - вставить содержимое в SQL Editor дашборда и выполнить;
   - или через Management API: положить personal access token (`sbp_...`, [страница токенов](https://supabase.com/dashboard/account/tokens)) в `.env.local` как `SUPABASE_ACCESS_TOKEN` и выполнить `node scripts/apply-sql.mjs supabase/migrations/000X_name.sql` (не забыть поменять PROJECT_REF в скрипте).
4. **Auth**: Authentication → Sign In / Up → Email включён, "Confirm email" включено.
   Authentication → URL Configuration:
   - Site URL: `https://leonpiter.github.io/family_three/`
   - Redirect URLs: `http://localhost:5173/**` и `https://leonpiter.github.io/family_three/**`
5. **Бутстрап первого админа** (один раз, после своей регистрации и подтверждения почты) — SQL Editor:
   ```sql
   update public.profiles
   set role = 'admin', status = 'approved'
   where email = 'ВАШ_EMAIL';
   ```

## Деплой на GitHub Pages

Автоматический — GitHub Actions ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) при пуше в `main`.

Разовая настройка репозитория:
1. Сделать репозиторий **Public** (бесплатный Pages не работает с приватными).
2. Settings → Pages → Source: **GitHub Actions**.
3. Settings → Secrets and variables → Actions → **Variables** → добавить
   `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` (anon key публичен by design, защита — RLS).

## Эксплуатация (free tier)

- **Пауза Supabase** после ~7 дней неактивности: предотвращается воркфлоу [keepalive.yml](.github/workflows/keepalive.yml) (пинг пн/чт); разбудить вручную — кнопка Restore в дашборде (~1–2 мин).
- **Бэкапы**: данные можно выгрузить кнопкой «Экспорт в Excel» прямо на доске; полный дамп — `npx supabase db dump`; фото — ручная выгрузка bucket'а `photos`.
- **Письма**: подключён Resend как custom SMTP (отправитель `Семейное древо <noreply@dualgate.ru>`), лимит 100 писем/час. Шаблоны писем — русские, задаются в Supabase → Auth → Email Templates.
- **Уведомления админу** (миграция 0011): при новой заявке на регистрацию и новом замечании к карточке всем админам уходит письмо (pg_net → Resend прямо из триггера БД).
  Ключ Resend **не хранится в репозитории** — он лежит в Supabase Vault и создаётся один раз:
  ```sql
  select vault.create_secret('re_xxx', 'resend_api_key', 'Resend API key');
  ```

## Как устроены права

- Зарегистрироваться может любой, доступ открывает админ («Заявки и участники»).
- Биографию карточки меняет её **автор**, **сам человек** (если админ привязал карточку к аккаунту) или **админ**; двигать кружочки и добавлять фото могут все одобренные. Защита — RLS и триггеры в БД, не только UI.
- Чужую карточку можно прокомментировать кнопкой «Написать админу» — замечание видно в карточке и в сводке админа.
- Удаление персоны — только админ (правый клик → «Удалить с доски»).

## Статус

Спринты 1–4 завершены, сервис работает: https://leonpiter.github.io/family_three/
Дальнейшие идеи — в [бэклоге спринт-плана](docs/SPRINT-PLAN.md).
