# DocuTrust AI

Private document Q&A for small teams: cited answers from your own files, role-scoped access, and a verifiable activity ledger. Final Year Project.

## What runs where

- `web/` — Next.js 16 public site and interactive Admin/Employee demo dashboards. This is the deployable app.
- `docutrust_site/`, `accounts/`, `site_pages/` — Django 5.2 backend: early-access API and admin.
- `core/` — Python retrieval, configuration and legacy SQLite helpers.
- `tests/`, `eval/` — pytest suite and retrieval checks.
- `config.toml`, `prompts/`, `texts.toml` — editable settings, prompts and legacy wording.

## Run locally

Prerequisites: Python 3.11+ and Node 20.9+.

Everything (Django on 8300, website on 3100):

```bash
./run.sh
```

- Website: <http://127.0.0.1:3100>
- Admin: <http://127.0.0.1:8300/admin/>

Frontend only:

```bash
cd web
npm install
cp .env.example .env.local
npm run dev -- --hostname 127.0.0.1 --port 3100
```

Backend only:

```bash
./.venv/bin/python manage.py runserver 127.0.0.1:8300
```

Tests:

```bash
PYTHONPATH=. .venv/bin/pytest -q
```

## Deploy the web app to Vercel

1. Push this repository to GitHub.
2. In Vercel, choose **Add New Project** and import the repository.
3. Set **Root Directory** to `web`.
4. Framework preset: **Next.js**; build command `npm run build`; output `.next`.
5. Add the environment variable `DJANGO_API_URL`, set to the public URL of the Django API.
6. Deploy.

All pages deploy and work without the environment variable; only the early-access form reports that the backend is not connected. The Django backend is not deployable to Vercel as a serverless function as written.

## Repository hygiene

- `.env` and `.env.local` are ignored; only `.env.example` files are tracked.
- `node_modules/`, `.next/`, `data/`, `.venv/` and local SQLite databases are ignored.
- No secrets belong in `web/`.

## Where to change common settings

| What to change | File |
|---|---|
| App name, models, chunk size, `top_k`, `min_score`, OKF boost/cap | `config.toml` |
| System prompt and refusal message | `prompts/answer.txt`, `prompts/refuse.txt` |
| Legacy Python UI wording | `texts.toml` |
| Local secrets (`DOCUTRUST_ADMIN_PASSWORD`, demo password) | `.env` (never committed; see `.env.example`) |
| Marketing copy and demo data | `web/src/components/landing/`, `web/src/components/dashboard/dashboardData.ts` |