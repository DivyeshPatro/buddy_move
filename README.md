<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# MoveBuddy Repository

This repository is stabilized around the root frontend and root backend.

## Active development path

- Frontend: root `src/` using `frontend/vite.config.ts`
- Backend: root `backend/server.ts`
- Official scripts: root `package.json`

Legacy or experimental scaffold folders not used by the active dev path:

- `frontend/package.json`, `frontend/src/`, `frontend/index.html`
- `backend/src/`, `backend/package.json`

Active container support:

- `docker-compose.yml` and `backend/Dockerfile` now build and run the active root backend (`backend/server.ts`) on port `3001`.

## Run locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env` and fill in required values:
   `cp .env.example .env`
3. Start both frontend and backend:
   `npm run dev`
4. Build for production:
   `npm run build`

## Ports

- Frontend: `http://localhost:3000`
- Backend API: proxied to `http://localhost:3001`

## Environment configuration

- The canonical local environment file is root `.env`.
- `docker-compose.yml` now reads root `.env`.
- `backend/server.ts` is the active backend and loads `dotenv/config` from root `.env`.

## Notes

- `npm run dev` starts the frontend and backend concurrently.
- To run just one side, use `npm run dev:frontend` or `npm run dev:backend`.
- The NestJS scaffold at `backend/src/` is legacy and not used by root scripts.
