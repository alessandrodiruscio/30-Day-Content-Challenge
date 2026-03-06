# 30-Day Content Challenge

A full-stack web application that uses AI to generate 30-day Instagram Reel content strategies for creators and businesses.

## Architecture

- **Frontend**: React 19 + Vite 6 + Tailwind CSS 4 (served via Vite middleware in dev)
- **Backend**: Express.js server (`server.ts`) running on port 5000
- **Database**: MySQL (external, via Hostinger — credentials set via environment variables)
- **AI**: Google Gemini API (`@google/genai`) for generating content strategies
- **Auth**: JWT-based authentication with bcryptjs password hashing

The app uses a single unified server (`server.ts`) that embeds Vite in middleware mode during development. In production, it serves the pre-built `dist/` directory.

## Key Files

- `server.ts` — Express server with all API routes and Vite middleware
- `src/App.tsx` — Main React application (2000+ lines, single-page app)
- `src/services/gemini.ts` — Gemini AI client helpers
- `src/utils/api.ts` — Fetch utility helpers
- `src/types.ts` — TypeScript type definitions
- `vite.config.ts` — Vite configuration
- `index.html` — HTML entry point

## Environment Variables

Required for full functionality (set via Replit Secrets):

- `GEMINI_API_KEY` — Google Gemini API key
- `JWT_SECRET` — Secret for signing JWT tokens
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` — MySQL credentials (Hostinger)
- `ACTIVECAMPAIGN_URL`, `ACTIVECAMPAIGN_API_KEY`, `ACTIVECAMPAIGN_TAG_NAME`, `ACTIVECAMPAIGN_MEMBER_TAG_NAME` — ActiveCampaign integration
- `COMMUNITY_DISCORD_URL`, `COMMUNITY_TRIAL_URL` — Community links
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` — Email sending via Resend
- `APP_URL` — Production URL for password reset links

## Running the App

```bash
npm run dev
```

Starts the combined Express + Vite dev server on port 5000.

## Building for Production

```bash
npm run build
```

Outputs to `dist/`. Production server runs via `npx tsx server.ts` with `NODE_ENV=production`.

## Deployment

Configured for autoscale deployment:
- Build: `npm run build`
- Run: `npx tsx server.ts`
