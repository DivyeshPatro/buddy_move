# MoveBuddy — Architecture Overview

## Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Frontend    | Next.js 15, TypeScript, Tailwind  |
| Backend     | NestJS 10, TypeScript             |
| Database    | PostgreSQL 15 + PostGIS           |
| Cache       | Redis 7                           |
| ORM         | Prisma 5                          |
| Auth        | JWT + Refresh Tokens + Truecaller |
| Payments    | Razorpay (primary), PhonePe (secondary) |
| Storage     | Cloudinary                        |
| Push        | Firebase FCM                      |
| SMS/OTP     | MSG91                             |
| Email       | Resend                            |
| Queues      | BullMQ (Redis-backed)             |
| WebSocket   | Socket.IO (NestJS Gateway)        |
| Monitoring  | Sentry + Prometheus + Grafana     |
| CI/CD       | GitHub Actions                    |
| Deployment  | Vercel (Frontend) + Railway (Backend) + Supabase (PostgreSQL) |

## Request Flow

```
User Browser → Next.js (Vercel)
                   │
                   │ /api/* rewrites
                   ▼
            NestJS Backend (Railway)
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
   PostgreSQL    Redis      Cloudinary
  (Supabase)  (Cache/Queue)  (Files)
```

## Admin Access Flow

```
Admin URL: admin.movebuddy.com (or /admin)
                   │
            Next.js Middleware
            (validates JWT + adminRole cookie)
                   │
       ┌───────────┴───────────┐
       │                       │
   Allowed                  Redirect →
   (ADMIN+)                /auth/login
       │
  Admin Dashboard
  (sidebar filtered by role)
       │
  API call with Authorization: Bearer <token>
       │
  NestJS @Roles() guard
       │
  403 Forbidden if insufficient role
```
