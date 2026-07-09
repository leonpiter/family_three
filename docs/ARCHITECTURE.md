# Архитектура: Семейное генеалогическое древо

Сервис для одной семьи: бесконечная доска с круглыми фото-нодами родственников, свободное DnD, линии связей «родитель—ребёнок» и «супруги», правый сайдбар с профилем и фотоальбомом. Регистрация открыта для всех, доступ к данным — только после одобрения администратором, и это обеспечивается на уровне БД (RLS), а не только UI.

Хостинг бесплатный: фронт — статика на **GitHub Pages** (репозиторий `leonpiter/family_three`), бэкенд — **Supabase free tier** (Auth + Postgres с Row Level Security + private Storage для фото). GitHub Pages не исполняет серверный код, поэтому вся логика доступа живёт в RLS-политиках Supabase.

Прод-URL: `https://leonpiter.github.io/family_three/`

## Стек

| Слой | Выбор |
|---|---|
| Build / UI | Vite ^7, React ^19, TypeScript, Tailwind CSS ^4 |
| Доска | @xyflow/react ^12 (React Flow) |
| State | zustand ^5 (рекомендован React Flow для controlled-режима) |
| Router | react-router ^7, **HashRouter** (Pages не умеет SPA-rewrites — иначе 404 при F5) |
| Backend | @supabase/supabase-js ^2, клиент с `flowType: 'pkce'` |
| Фото | browser-image-compression ^2 (сжатие на клиенте), yet-another-react-lightbox ^3 |
| Прочее | dayjs (locale ru), sonner (тосты), vitest |

Все русские строки UI — в `src/lib/strings.ts` (без i18n-библиотеки, язык один). Схема БД — миграции через Supabase CLI (`npx supabase db push`), запасной путь — SQL Editor в дашборде.

## Структура проекта

```
family_thre/
├── .github/workflows/deploy.yml      # build + deploy на Pages
│                      keepalive.yml  # cron-пинг Supabase (анти-пауза free tier)
├── docs/                             # этот документ + SPRINT-PLAN.md
├── supabase/migrations/
│   ├── 0001_profiles.sql   # enum'ы, profiles, триггер on auth.users, is_approved()/is_admin()
│   ├── 0002_persons.sql    # persons, relationships
│   ├── 0003_photos.sql     # photos, ALTER persons ADD avatar_photo_id, storage-политики
│   └── 0004_keepalive.sql
├── src/
│   ├── App.tsx, main.tsx
│   ├── app/routes.tsx, RequireApproved.tsx     # гейт session + profile.status
│   ├── components/ui/      # Button, Modal, Spinner, Avatar, Field
│   ├── features/
│   │   ├── auth/           # LoginPage, RegisterPage, PendingPage, authStore.ts
│   │   ├── admin/          # AdminPage (одобрение юзеров, привязка user↔person)
│   │   ├── board/          # BoardPage, PersonNode, boardStore.ts, mapToFlow.ts,
│   │   │                   # ConnectTypeDialog, CreatePersonDialog, edgeStyles.ts
│   │   ├── person/         # PersonSidebar, PersonView, PersonForm, RelationshipList
│   │   └── photos/         # PhotoAlbum, PhotoUploadZone, PhotoLightbox, usePhotoUpload.ts
│   ├── hooks/              # useDebouncedCallback, useSignedUrls
│   ├── lib/                # supabase.ts, image.ts, signedUrlCache.ts, relations.ts, strings.ts
│   └── types/              # db.ts (supabase gen types), domain.ts
├── vite.config.ts          # base: '/family_three/'  ← имя GitHub-репозитория
└── README.md               # runbook: настройка Supabase, бутстрап админа, бэкапы
```

## Модель данных

- **profiles** — id = auth.users.id, display_name, `status` (pending|approved|rejected, default pending), `role` (member|admin). Создаётся триггером `after insert on auth.users`.
- **persons** — ноды дерева: ФИО, девичья фамилия, пол, даты рождения/смерти, место рождения, bio, `avatar_photo_id` (FK на photos, добавляется ALTER'ом в 0003 из-за циклической ссылки, ON DELETE SET NULL), `user_id` UNIQUE → profiles («карточку ведёт этот аккаунт», назначает админ), `pos_x/pos_y` (позиция на доске), created_by, timestamps.
- **relationships** — from_person_id, to_person_id, `type` (parent|spouse). `parent` — ребро от родителя к ребёнку; `spouse` нормализуется (меньший uuid в from) + уникальный индекс `(least, greatest) WHERE type='spouse'`. Сиблинги не хранятся — вычисляются.
- **photos** — person_id (CASCADE), storage_path, thumb_path, caption, uploaded_by.
- **keepalive** — одна строка для cron-пинга.

### RLS (ключевая безопасность)

SECURITY DEFINER-хелперы `is_approved()` / `is_admin()` (избегаем рекурсии политик на profiles). Матрица:

| Таблица | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| profiles | своя строка ИЛИ approved ИЛИ admin | нет (триггер) | своя (display_name) ИЛИ admin; смену status/role гардит BEFORE UPDATE-триггер | admin |
| persons | approved | approved | approved (user_id — только admin, триггер) | admin |
| relationships | approved | approved | approved | approved |
| photos | approved | approved + uploaded_by=uid | approved (подписи) | владелец ИЛИ admin |

Storage: bucket `photos` — **private**, политики на storage.objects (select/insert — approved, delete — владелец/админ). Пути: `{person_id}/{uuid}.webp` + `{person_id}/thumb_{uuid}.webp`. Доступ через батчевый `createSignedUrls` + in-memory кэш с TTL (`lib/signedUrlCache.ts`).

## Auth + одобрение

1. Регистрация: `signUp` с email-подтверждением, `emailRedirectTo` = прод-URL Pages.
2. **PKCE обязателен**: implicit-flow кладёт токены в `location.hash` и конфликтует с HashRouter; PKCE несёт `?code=` в query — конфликта нет.
3. `RequireApproved`: нет сессии → /login; pending/rejected → /pending («Ожидайте одобрения»); approved → приложение. Это UX-слой, реальная защита — RLS.
4. Первый админ — вручную одним SQL в дашборде (документируется в README): `update profiles set role='admin', status='approved' where id = (select id from auth.users where email='...')`.
5. `/admin`: список профилей, «Одобрить»/«Отклонить», привязка аккаунта к персоне на дереве.

## Доска (React Flow)

- **PersonNode**: круг ~90px — аватар (signed URL thumb) или инициалы на цветном фоне, под ним имя и годы «1954–2020». Handles малозаметные, проявляются на hover.
- Controlled-режим: `mapToFlow.ts` (persons/relationships → nodes/edges), состояние в `boardStore` (zustand).
- **Персист позиций**: `onNodeDragStop` → батч-upsert pos_x/pos_y, debounce 400 мс. Во время drag не пишем.
- **Создание связи**: drag-to-connect → `ConnectTypeDialog` («Родитель → ребёнок» / наоборот / «Супруги») → insert. Дублирующий путь из сайдбара + удаление связи там же.
- **Рёбра**: `parent` — smoothstep, сплошная серая со стрелкой; `spouse` — straight, пунктир, тёплый цвет, без стрелки (`edgeStyles.ts`).
- **Создание персоны**: кнопка «+ Добавить родственника» и double-click по полотну (`screenToFlowPosition`).
- Оснастка: Background dots, Controls, MiniMap, fitView, zoom 0.1–2.
- Realtime-синхронизация — фаза 2 (store имеет `applyRemoteChange`); MVP: загрузка при монтировании + оптимистичные апдейты + refetch на visibilitychange.

## Правый сайдбар

Панель ~380px по клику на ноду (`selectedPersonId`), закрытие — ×/Esc/клик по полотну. PersonView ↔ PersonForm (если `user_id === auth.uid()` — бейдж «Это вы»). Ниже — RelationshipList и PhotoAlbum (грид thumb'ов, drag-n-drop загрузка, лайтбокс с подписями, «Сделать аватаром»).

Пайплайн фото: валидация ≤15 МБ → полноразмер webp 1600px/≤0.4МБ → thumb 320px/≤0.05МБ → два upload + insert в photos. Доска и грид тянут только thumb'ы (экономия egress), полноразмер — в лайтбоксе.

## Деплой на GitHub Pages

- `vite.config.ts`: `base: '/family_three/'`.
- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — repository **variables** (anon key публичен by design, защита — RLS).
- `deploy.yml`: push в main → setup-node 22 → npm ci → build → upload-pages-artifact → deploy-pages. Pages Source: GitHub Actions.
- `keepalive.yml`: cron 2 раза в неделю, `curl` к `rest/v1/keepalive` — не даёт free-проекту Supabase заснуть (пауза после ~7 дней неактивности).
- **Бесплатные Pages требуют публичный репозиторий** — перед первым деплоем сменить видимость `family_three` на Public. URL сайта общедоступен, граница безопасности — строго Auth + RLS + private bucket; в репо не кладётся ничего секретного.

## Риски и лимиты free tier

- Пауза Supabase после ~7 дней неактивности → keepalive-cron; ручное пробуждение — кнопка Restore в дашборде.
- Storage 1 ГБ ≈ 2200 фото при выбранном сжатии. Egress 5 ГБ/мес — экономят thumb-first и кэш signed URLs.
- Встроенный SMTP Supabase шлёт единицы писем в час — для семейных регистраций хватит; при нехватке — бесплатный Resend как custom SMTP.
- Бэкапы: раз в месяц `supabase db dump` локально (заметка в README).
