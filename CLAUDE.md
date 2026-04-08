# Anonymous Review Club

## Назначение

Веб-платформа для публикации анонимных рецензий на медиаконтент (книги, фильмы, музыка, сериалы, игры, подкасты). Авторство рецензии скрыто, пока она не наберёт настраиваемый порог лайков (по умолчанию 10), после чего имя автора раскрывается автоматически. Раскрытие one-way — не откатывается при снятии лайков.

## Стек технологий

- **Backend:** Node.js 20 + Express 4.21, Prisma 6.3, PostgreSQL 17
- **Frontend:** React 19 + Vite 6.0, React Router 7.1, Axios 1.7, CSS Modules
- **Аутентификация:** JWT (jsonwebtoken) + bcryptjs
- **Инфраструктура:** Docker + Docker Compose + Nginx

## Архитектура

3 Docker-контейнера:
- `db` — PostgreSQL 17 (alpine), healthcheck, persistent volume `pgdata`
- `backend` — Express API на порту 3001, автоприменение миграций при старте (`prisma migrate deploy`)
- `frontend` — React SPA (Vite build → Nginx), проксирование `/api` на backend

## Структура проекта

```
anonymous-review-club/
├── docker-compose.yml
├── backend/
│   ├── .env / .env.example
│   ├── Dockerfile
│   ├── package.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── src/
│       ├── index.js                # Express app, CORS, маршруты, graceful shutdown
│       ├── db.js                   # Prisma client
│       ├── controllers/
│       │   ├── auth.js             # register(), login()
│       │   ├── reviews.js          # CRUD + голосование + раскрытие + фильтрация + теги
│       │   ├── comments.js         # CRUD комментариев
│       │   ├── tags.js             # Autocomplete тегов
│       │   └── bookmarks.js        # CRUD закладок
│       ├── middleware/
│       │   ├── auth.js             # JWT authenticate (401 при невалидном)
│       │   ├── optional-auth.js    # JWT без 401 (ставит req.userId = null)
│       │   └── asyncHandler.js     # Promise error wrapper
│       └── routes/
│           ├── auth.js
│           ├── reviews.js
│           ├── comments.js
│           ├── tags.js
│           └── bookmarks.js
└── frontend/
    ├── Dockerfile                  # Multi-stage: Node build → Nginx serve
    ├── nginx.conf                  # Proxy /api → backend:3001, SPA fallback
    ├── vite.config.js              # Dev proxy /api → localhost:3001
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx                 # Маршруты, ProtectedRoute, GuestRoute
        ├── constants.js            # MEDIA_LABELS, MEDIA_TYPES, TOKEN_KEY, USER_KEY
        ├── api/client.js           # Axios + JWT interceptor + auto-logout на 401
        ├── context/AuthContext.jsx  # Auth state, localStorage persistence
        ├── hooks/use-debounce.js
        ├── pages/
        │   ├── HomePage.jsx        # Лента + FilterBar + пагинация
        │   ├── LoginPage.jsx
        │   ├── RegisterPage.jsx
        │   ├── SubmitPage.jsx      # Создание рецензии
        │   ├── ProfilePage.jsx     # Мои рецензии (edit/delete inline)
        │   ├── ReviewDetailPage.jsx # Детальная + комментарии
        │   └── BookmarksPage.jsx
        ├── components/
        │   ├── Header.jsx
        │   ├── ReviewCard.jsx      # Карточка с vote/bookmark toggle
        │   ├── FilterBar.jsx       # Поиск, фильтр типа, сортировка, тег
        │   ├── Pagination.jsx
        │   ├── StarRating.jsx      # 1-5 звёзд (interactive/readonly)
        │   ├── TagInput.jsx        # Ввод тегов с autocomplete
        │   ├── EditReviewForm.jsx
        │   ├── CommentList.jsx
        │   └── CommentForm.jsx
        └── styles/                 # CSS Modules для каждого компонента
```

## База данных (7 моделей)

- **User** — id, username (unique), email (unique), password_hash, created_at → reviews, votes, comments, bookmarks
- **Review** — id, user_id, title (200), content (text), media_type (enum: book/film/music/series/games/podcasts), rating (1-5, nullable), likes_count, is_author_revealed, created_at → author, votes, tags, comments, bookmarks
- **Vote** — user_id + review_id (unique constraint), one vote per user per review
- **Tag** — id, name (unique, 50) → reviews через ReviewTag
- **ReviewTag** — review_id + tag_id (составной PK), many-to-many
- **Comment** — id, user_id, review_id, content (2000), is_anonymous (default true), created_at
- **Bookmark** — user_id + review_id (unique constraint)

Каскадное удаление: User → все его данные; Review → голоса, комментарии, закладки, теги.

## API (16 эндпоинтов)

### Аутентификация
- `POST /api/auth/register` — username (3-50), email, password (6+) → JWT (7 дней)
- `POST /api/auth/login` — email, password → JWT

### Рецензии
- `GET /api/reviews` — пагинация, фильтрация (media_type, search, tag), сортировка (date_desc/asc, popular, rating). OptionalAuth → has_voted, is_bookmarked
- `POST /api/reviews` — title, content, media_type, rating?, tags?. Антиспам: 1 рецензия с тем же названием за 24ч
- `GET /api/reviews/my` — свои рецензии (auth)
- `GET /api/reviews/:id` — детальная (optionalAuth)
- `PUT /api/reviews/:id` — редактирование (только автор)
- `DELETE /api/reviews/:id` — удаление (только автор)

### Голосование
- `POST /api/reviews/:id/vote` — лайк (транзакция: не автор, не дубликат, автораскрытие)
- `DELETE /api/reviews/:id/vote` — снять лайк

### Комментарии
- `GET /api/reviews/:reviewId/comments` — пагинация, optionalAuth → is_own
- `POST /api/reviews/:reviewId/comments` — content, is_anonymous (auth)
- `DELETE /api/reviews/:reviewId/comments/:id` — удалить свой (auth)

### Теги
- `GET /api/tags?search=...` — prefix autocomplete (макс 20)

### Закладки
- `GET /api/bookmarks` — мои закладки с пагинацией (auth)
- `POST /api/reviews/:id/bookmark` — добавить (auth)
- `DELETE /api/reviews/:id/bookmark` — удалить (auth)

## Frontend маршруты

| Маршрут | Страница | Доступ |
|---------|----------|--------|
| `/` | Лента рецензий (поиск, фильтры, пагинация, голосование, закладки) | Публичный |
| `/login` | Вход | Только гости |
| `/register` | Регистрация | Только гости |
| `/submit` | Создание рецензии (тип, рейтинг, теги, текст) | Auth |
| `/profile` | Мои рецензии (inline редактирование, удаление) | Auth |
| `/reviews/:id` | Детальная страница (текст, комментарии, голос, закладка) | Публичный |
| `/bookmarks` | Мои закладки | Auth |

## Ключевая бизнес-логика

1. **Анонимность** — все рецензии от "Аноним". Раскрытие автора при likes_count >= REVEAL_THRESHOLD (env, default 10). One-way: не откатывается.
2. **Голосование** — атомарная Prisma транзакция: проверка → создание Vote → инкремент likes_count → проверка порога раскрытия.
3. **Антиспам** — один пользователь не может опубликовать рецензию с тем же названием (case-insensitive) чаще чем раз в 24 часа.
4. **Аутентификация** — JWT в localStorage, Axios interceptor добавляет Bearer token, при 401 auto-logout через window event.
5. **Теги** — upsert при создании, autocomplete через prefix search, фильтрация ленты по тегу. Макс 5 тегов на рецензию, каждый макс 50 символов.

## Конфигурация

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/review_club
JWT_SECRET=super_secret_change_me_in_production
PORT=3001
REVEAL_THRESHOLD=10
CORS_ORIGIN=http://localhost:3000
```

## Запуск

```bash
# Docker (рекомендуется)
docker compose up --build
# Frontend: http://localhost:3000
# Backend: http://localhost:3001

# Локально
cd backend && npm install && npx prisma migrate dev && npm run dev
cd frontend && npm install && npm run dev
```

## Правила разработки

- Общение на русском, код/комменты/переменные на английском
- Функциональный подход, ранний return, деструктуризация
- Файлы в kebab-case, переменные в camelCase, типы в PascalCase, константы в UPPER_SNAKE_CASE
- Общие константы (MEDIA_LABELS, MEDIA_TYPES, TOKEN_KEY, USER_KEY) в `frontend/src/constants.js`
- Валидация входных данных на backend (ручная, с ранним return и типизированными ошибками)
- Каскадное удаление через Prisma schema (onDelete: Cascade)
- CSS Modules для изоляции стилей компонентов
