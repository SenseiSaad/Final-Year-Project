# DocuTrust AI — web

Next.js 16 public site for DocuTrust: landing page, interactive demo workspace for the admin and employee roles, privacy and terms.

The dashboards run entirely in the browser with sample data. No real documents, accounts or personal data are served.

## Local development

Prerequisites: Node 20.9 or newer.

```bash
npm install
cp .env.example .env.local   # optional; sets DJANGO_API_URL for the early-access form
npm run dev -- --hostname 127.0.0.1 --port 3100
```

Open <http://127.0.0.1:3100>.

The early-access form posts to the Django API at `DJANGO_API_URL`. If it is not set, the site still runs and the form explains that the connection is not configured.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server (use `-- --port 3100`) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

## Deploy to Vercel

1. Push the repository to GitHub.
2. In Vercel, choose **Add New Project** and import the repository.
3. Set **Root Directory** to `web`.
4. Framework preset: **Next.js**; build command `npm run build`; output `.next`.
5. Add the environment variable `DJANGO_API_URL` with the public URL of the Django backend.
6. Deploy.

Without `DJANGO_API_URL`, every page deploys and works; only the early-access form reports that it is not connected. The Python backend is not deployable as a Vercel serverless function as written.

## Structure

```text
src/app/                  routes: /, /dashboard, /dashboard/admin, /dashboard/employee, /privacy, /terms
src/components/landing/   marketing sections, early-access dialog and form
src/components/dashboard/ demo workspace views and data
src/components/site/      nav, footer, logo, theme toggle
src/components/core/      motion components: text effect, text morph, text scramble, text shimmer,
                          animated number, accordion, dialog, morphing popover, transition panel
src/lib/                  facts, sample data, small utilities
```

## Environment

`.env.local` and `.env` are ignored by git. Only `.env.example` is tracked.