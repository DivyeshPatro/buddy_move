# MOVEBUDDY Discovery Report

## 1. Executive Summary

This repository is a hybrid React/Vite frontend with a Node/Express backend and Prisma-managed PostgreSQL persistence. The application under development is a ride-sharing / commute coordination platform with guest/host workflows, admin controls, wallet/subscription/payment flows, notifications, AI recommendations, and real-time trip updates.

Recent work focused on stabilizing authentication/session persistence, removing obsolete theme toggles, and hardening backend persistence so PostgreSQL is the single source of truth.

## 2. Architecture Overview

### Frontend
- Framework: React with Vite.
- Source path: `src/` and `frontend/`.
- Key app entry: `src/App.tsx`.
- Session handling: `src/lib/session.ts` stores JWT access/refresh tokens in `localStorage`.
- Fetch interceptor: `src/lib/api.ts` attaches `Authorization: Bearer` to API requests and transparently refreshes access tokens on 401.
- Persistent session snapshot: `src/App.tsx` restores `movebuddy_user_session` from `localStorage`, renders cached user data immediately, and verifies it via `/api/auth/me/:userId`.
- Customer experience: guest/host dashboards and ride flow are implemented in `src/components/*`.

### Backend
- Main API: `backend/server.ts`.
- Authentication module: `backend/auth.ts`.
- Database persistence: `backend/db.ts` via Prisma.
- Runtime support: `backend/realtime.ts`, `backend/matching.ts`, `backend/maps.ts`, `backend/otp.ts`, `backend/notifications.ts`.
- Docker Compose and backend container exist at root and backend respectively.

### Persistence
- Prisma client is used in `backend/db.ts` and `backend/prisma.ts`.
- `loadState` loads users, rides, ride requests, subscriptions, matches, trips, payments, chat, tickets, notifications, wallet state, promo codes, vouchers, CMS pages, subscription plans, and config rows.
- `persistAll` upserts state back into PostgreSQL with `safeUpsert` utilities.
- Current design aims to eliminate any temporary JSON/in-memory persistence and use PostgreSQL as the single source of truth.

## 3. Authentication & Session Flow

### JWT and tokens
- Access tokens issued by `signTokens(user)` in `backend/auth.ts`.
- Refresh tokens are also issued and verified by `verifyRefreshToken()`.
- Access TTL: env `JWT_EXPIRES_IN` or default `15m`
- Refresh TTL: env `JWT_REFRESH_EXPIRES_IN` or default `30d`
- Two secrets: `JWT_SECRET` and `JWT_REFRESH_SECRET`.
- Production startup fails if secrets are missing.

### Client flow
- `AuthModal` and login flows store tokens in `localStorage` via `setTokens`.
- `window.fetch` wrapper in `src/lib/api.ts` intercepts calls, adds auth header, and handles refresh when a 401 occurs.
- On refresh success, tokens are rewritten in storage.
- On refresh failure, tokens are cleared and `mb:session-expired` event is dispatched.

### Session restoration
- `src/App.tsx` restores `movebuddy_user_session` on startup.
- It uses cached user snapshot for instant render then verifies freshness with `/api/auth/me/:userId`.
- If the verification fails, the app clears tokens and the local session.
- This design is intended to keep users logged in across browser refresh and restart while preventing stale or invalid sessions.

## 4. Product Scope and Key Flows

### Core user flows
- Guest commute search/booking.
- Host ride offers and matching.
- Wallet balance, credit, and transaction history.
- Subscription purchase and plan management.
- SOS/support ticket creation.
- Chat messaging and notifications.

### Admin platform
- `src/components/AdminDashboard.tsx` contains the admin UI and permission model.
- Admin sections include dashboard, user management, rides, KYC, pricing, subscriptions, wallet, promos, vouchers, notifications, CMS, branding, feature flags, analytics, support, audit, and settings.
- Theme toggle or theme engine support has been removed from the admin UI and backend paths.

### Payments and subscriptions
- Razorpay integration exists in `backend/server.ts` and can be disabled via `PAYMENTS_DEV_BYPASS=true`.
- Payment flows include order creation, verification, and subscription purchase.
- Subscriptions are calculated and persisted using database-backed subscription plans.

## 5. Infrastructure & Deployment

- Root-level `package.json` contains scripts for `dev`, `build`, `start`, and `lint`.
- Backend dev server uses `tsx backend/server.ts`.
- Build bundles frontend with Vite and backend with esbuild.
- Docker Compose exists at repository root and likely includes PostgreSQL and backend services.
- `backend/db.ts` confirms PostgreSQL connectivity through Prisma.

## 6. Risks and Recommendations

### Risks
1. Session verification depends on `/api/auth/me/:userId` and local snapshot. If backend user lookup is stale or misaligned with token state, session restoration may diverge from actual auth state.
2. Token storage uses `localStorage`, which is acceptable for this SPA but exposes tokens to XSS risk. Consider secure httpOnly cookies if the app moves toward higher security requirements.
3. Admin access uses role-based mechanism, but route-level checks must be audited for all admin `POST`/`PUT`/`DELETE` endpoints.
4. The backend still exposes many broad admin APIs; a review is needed to ensure `X-Admin-Id` / authorization is enforced consistently.
5. Some frontend code paths appear to keep stale user snapshots while offline; this is useful for resilience but should be tested carefully.

### Recommendations
- Confirm the refresh token route is called only when access has actually expired and not for auth-exempt endpoints.
- Add server-side middleware to validate access tokens for all protected APIs rather than relying on manual per-route checks.
- Remove any remaining theme-related backend endpoints and frontend references to avoid feature drift.
- Harden admin routes with explicit role middleware, not just `X-Admin-Id` header checks.
- Validate the Prisma schema and migration state in `backend/prisma` if not already up to date.

## 7. Notes on Recent Changes

- The app has been updated to remove light/dark theme toggling from the admin UI and backend configuration paths.
- Backend persistence has been strengthened so state is saved through Prisma rather than in-memory-only structures.
- Session restoration and token refresh flows have been documented and appear to be implemented in `src/App.tsx` and `src/lib/api.ts`.

## 8. Files of Interest
- `backend/server.ts`
- `backend/auth.ts`
- `backend/db.ts`
- `backend/prisma.ts`
- `src/App.tsx`
- `src/lib/api.ts`
- `src/lib/session.ts`
- `src/components/AdminDashboard.tsx`
- `src/components/GuestDashboard.tsx`
- `package.json`

---

This report is based on repository files, current workspace state, and the latest session summary provided during code review.
