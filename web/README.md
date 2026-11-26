# DocuTrust AI — web

Next.js 16 front end: the landing page and the responsive workspace (AI chat, team chat, documents, people and roles, audit log). The workspace talks to the Django service in the repository root; the browser never holds provider keys.

> **Public demo, no sign-in.** The persona selector previews role permissions and is not authentication. Use synthetic data only.

## Local development

Prerequisites: Node 20.9 or newer, and the Django service running on `127.0.0.1:8300` (see the root README).

```bash
npm install
cp .env.example .env.local
npm run dev -- --hostname 127.0.0.1 --port 3100
```

Open <http://127.0.0.1:3100>. Without Django running, the workspace shows a connection error with the command to start it; the landing page still works.

## Environment

| Variable | Used by | Purpose |
|---|---|---|
| `NEXT_PUBLIC_WORKSPACE_API_URL` | browser (inlined at build time) | Base URL of the Django service for `/api/workspace/`. Falls back to `http://127.0.0.1:8300` in development only. |
| `DJANGO_API_URL` | Next.js server | Early-access form submissions. |

The Django side must list this site's origin in `DOCUTRUST_CORS_ALLOWED_ORIGINS`. Never put Gemini or Hosted keys in `web/`.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server (use `-- --port 3100`) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

## Deploy to Vercel

1. Import the repository and set **Root Directory** to `web`.
2. Add `NEXT_PUBLIC_WORKSPACE_API_URL` and `DJANGO_API_URL`, both set to the public HTTPS URL of the Django service.
3. Deploy. Redeploy after changing `NEXT_PUBLIC_WORKSPACE_API_URL`, because it is inlined into the bundle.

The Django service needs a persistent disk for SQLite and uploads, so it is hosted separately (see the root README). Without it the landing page deploys and works, and the workspace reports that the backend is unreachable.

## Structure

```text
src/app/                  routes: /, /dashboard, /dashboard/admin, /dashboard/employee, /privacy, /terms
src/components/landing/   landing sections and early-access dialog
src/components/dashboard/ workspace shell and views (chat, team chat, documents, directory, audit)
src/components/site/      nav, footer, logo, theme toggle
src/components/core/      motion primitives
src/lib/workspace-api.ts  typed browser client for the Django API
```
