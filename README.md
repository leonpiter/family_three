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
2. **Ключи**: Project Settings → API → скопировать `Project URL` и `anon public` key в `.env.local`:
   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```
3. **Схема БД**: применить SQL-файлы из `supabase/migrations/` по порядку (0001, затем 0004) — проще всего вставить содержимое в SQL Editor дашборда и выполнить.
4. **Auth**: Authentication → Sign In / Up → Email: включён, "Confirm email" — включено.
   Authentication → URL Configuration:
   - Site URL: `https://leonpiter.github.io/family_three/`
   - Redirect URLs: добавить `http://localhost:5173/**`
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

- **Пауза Supabase** после ~7 дней неактивности: keepalive-cron появится в Спринте 4; разбудить вручную — кнопка Restore в дашборде (~1–2 мин).
- **Бэкапы**: раз в месяц `npx supabase db dump` локально; фото — ручная выгрузка bucket'а.
- **Письма**: встроенный SMTP Supabase шлёт единицы писем в час. Если регистраций много — подключить бесплатный Resend как custom SMTP.

## Статус

Спринт 1 (каркас, аутентификация, одобрение) — код готов; ожидает создания проекта Supabase и первого деплоя. Далее: Спринт 2 — доска с React Flow.
