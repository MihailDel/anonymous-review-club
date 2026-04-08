# Anonymous Review Club

Platform for anonymous book and film reviews. Authors remain hidden until a review reaches 10 likes — then the author's name is revealed automatically.

## Tech Stack

- **Backend:** Node.js, Express, Prisma ORM, PostgreSQL
- **Frontend:** React, React Router, Vite, CSS Modules
- **Auth:** JWT (JSON Web Tokens)
- **HTTP Client:** Axios
- **Infrastructure:** Docker, Docker Compose

## Project Structure

```
anonymous-review-club/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── prisma/
│   │   └── schema.prisma        — database schema & migrations
│   └── src/
│       ├── db.js                 — Prisma client
│       ├── controllers/auth.js   — register, login
│       ├── controllers/reviews.js — CRUD, voting, reveal logic
│       ├── middleware/auth.js    — JWT verification
│       ├── middleware/asyncHandler.js
│       ├── routes/               — auth, reviews
│       └── index.js              — entry point
├── frontend/
│   ├── Dockerfile
│   └── src/
│       ├── api/client.js         — Axios instance
│       ├── components/           — Header, ReviewCard, Pagination
│       ├── context/AuthContext.jsx
│       ├── pages/                — Home, Login, Register, Submit, Profile
│       ├── styles/               — CSS Modules
│       └── App.jsx
└── README.md
```

## Quick Start with Docker

```bash
docker compose up --build
```

That's it. Docker Compose will:
1. Start PostgreSQL 17
2. Run Prisma migrations automatically
3. Start the backend on http://localhost:3001
4. Start the frontend on http://localhost:3000

To stop:

```bash
docker compose down
```

To reset the database:

```bash
docker compose down -v
docker compose up --build
```

## Local Development (without Docker)

### Prerequisites

- Node.js 20+
- PostgreSQL 14+

### Setup

1. Install dependencies:

```bash
cd backend && npm install
cd ../frontend && npm install
```

2. Create the database:

```sql
CREATE DATABASE review_club;
```

3. Configure environment:

```bash
cp backend/.env.example backend/.env
# edit backend/.env with your database credentials
```

4. Run Prisma migrations:

```bash
cd backend
npx prisma migrate dev --name init
```

5. Start development servers:

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

## Database Schema

### users
| Column        | Type         | Constraints       |
|---------------|--------------|-------------------|
| id            | SERIAL       | PRIMARY KEY       |
| username      | VARCHAR(50)  | UNIQUE, NOT NULL  |
| email         | VARCHAR(255) | UNIQUE, NOT NULL  |
| password_hash | VARCHAR(255) | NOT NULL          |
| created_at    | TIMESTAMP    | DEFAULT NOW()     |

### reviews
| Column             | Type         | Constraints           |
|--------------------|--------------|----------------------|
| id                 | SERIAL       | PRIMARY KEY          |
| user_id            | INTEGER      | FK → users, NOT NULL |
| title              | VARCHAR(200) | NOT NULL             |
| content            | TEXT         | NOT NULL             |
| media_type         | ENUM         | 'book' or 'film'     |
| likes_count        | INTEGER      | DEFAULT 0            |
| is_author_revealed | BOOLEAN      | DEFAULT false        |
| created_at         | TIMESTAMP    | DEFAULT NOW()        |

### votes
| Column    | Type    | Constraints                       |
|-----------|---------|-----------------------------------|
| id        | SERIAL  | PRIMARY KEY                       |
| user_id   | INTEGER | FK → users, NOT NULL              |
| review_id | INTEGER | FK → reviews, NOT NULL            |
|           |         | UNIQUE(user_id, review_id)        |

## API Endpoints

| Method | Path                     | Auth | Description                    |
|--------|--------------------------|------|--------------------------------|
| POST   | /api/auth/register       | No   | Register a new user            |
| POST   | /api/auth/login          | No   | Login, returns JWT             |
| GET    | /api/reviews             | No   | Paginated review feed          |
| POST   | /api/reviews             | Yes  | Create a review (anti-spam)    |
| GET    | /api/reviews/my          | Yes  | Current user's reviews         |
| POST   | /api/reviews/:id/vote    | Yes  | Like a review (once per user)  |

## Key Business Logic

- **Author reveal:** when `likes_count` reaches 10 (configurable via `REVEAL_THRESHOLD`), the author's username is shown instead of "Аноним"
- **Anti-spam:** a user cannot create two reviews with the same title (case-insensitive) within 24 hours
- **One vote per user per review:** duplicate votes return 409
- **Self-vote protection:** authors cannot vote on their own reviews

## Environment Variables

| Variable         | Description                       | Default              |
|------------------|-----------------------------------|----------------------|
| DATABASE_URL     | PostgreSQL connection string      | —                    |
| JWT_SECRET       | Secret key for JWT signing        | —                    |
| PORT             | Backend server port               | 3001                 |
| REVEAL_THRESHOLD | Likes needed to reveal author     | 10                   |
| CORS_ORIGIN      | Allowed origins (comma-separated) | http://localhost:3000 |

## Useful Commands

```bash
# Open Prisma Studio (database GUI)
cd backend && npm run db:studio

# Create a new migration after schema changes
cd backend && npm run db:migrate

# View Docker logs
docker compose logs -f backend
```
