# DocuTrust AI

Local-first document Q&A, controlled sharing, attendance, and tamper-evident audit workspace (Final Year Project).

## Project layout

- `web/` — Next.js 16 (App Router + Tailwind CSS v4) public site and interactive Admin/Employee early-access dashboards (deploys on Vercel).
- `core/` — Beginner-readable Python modules (`config.py`, `db.py`, `retrieve.py` with permission-first hybrid retrieval and system-level OKF).
- `docutrust_site/`, `accounts/`, `site_pages/` — Local Django 5.2 backend.
- `config.toml`, `texts.toml`, `prompts/` — Editable settings, wording, and AI prompt templates.
- `tests/` — Pytest suite covering config, SQLite schema, OKF retrieval, and Django endpoints.

## Local quick start

```bash
cp .env.example .env
./run.sh
```

- Website: `http://localhost:3000`
- Django admin: `http://127.0.0.1:8300/admin/`
- Run tests: `PYTHONPATH=. .venv/bin/pytest -v tests`

## Deploy frontend to Vercel

1. Push this repository to GitHub.
2. Import the repository in **Vercel → Add New Project**.
3. Set **Root Directory** to `web` (Framework Preset: **Next.js**, default build `npm run build`).
4. Click **Deploy** (no environment variables are required for the public site and interactive Admin/Employee test dashboards).

## Where to change common settings

| What to change | File |
|---|---|
| App name, models, chunk size, `top_k`, `min_score`, OKF boost/cap | `config.toml` |
| System prompt & refusal message | `prompts/answer.txt`, `prompts/refuse.txt` |
| UI text strings (Python shell) | `texts.toml` |
| Local secrets (`DOCUTRUST_ADMIN_PASSWORD`, attendance secret) | `.env` (never committed; see `.env.example`) |
