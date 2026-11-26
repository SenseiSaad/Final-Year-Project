# DocuTrust AI

Private document Q&A for small teams: cited answers from your own files, role-scoped access, and a verifiable activity ledger. Final Year Project.

## What runs where

- `web/` — Next.js 16 landing page and the responsive workspace UI (deployable to Vercel).
- `workspace/` — Django app behind the workspace: documents and search, AI chat, team rooms, departments and roles, hash-chained audit log, and the Local / Gemini / Hosted provider adapters. Data lives in SQLite; uploads live on the Django host.
- `docutrust_site/`, `accounts/`, `site_pages/` — Django project, the early-access API and the admin.
- `core/`, `app.py`, `pages/` — the earlier Streamlit prototype and its retrieval helpers; kept intact and not used by the workspace.
- `tests/`, `eval/` — pytest suite and retrieval checks.

> **Public demo, no sign-in.** The workspace has no authentication. The persona selector (Admin, CEO, Manager, Finance, HR, Employee, plus any you add) only *previews* role and department permissions, and anyone can pick Admin. Use synthetic documents only. Do not store real employee or customer data. The audit hash chain exposes edits but is not externally anchored.

## Run locally

Prerequisites: Python 3.11+, Node 20.9+, and optionally [Ollama](https://ollama.com) for the Local provider.

```bash
./run.sh          # migrates the database, then starts Django on 8300 and the site on 3100
```

- Website: <http://127.0.0.1:3100> · Workspace: <http://127.0.0.1:3100/dashboard>
- Django admin / API: <http://127.0.0.1:8300/admin/> · `/api/workspace/`

Or step by step:

```bash
python -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env                         # then edit provider settings below
.venv/bin/python manage.py migrate           # creates tables and seeds personas, departments and the General room
.venv/bin/python manage.py runserver 127.0.0.1:8300

cd web && npm install && cp .env.example .env.local
npm run dev -- --hostname 127.0.0.1 --port 3100
```

`manage.py seed_workspace` re-creates any missing built-in persona, role, department or the General room without touching your edits.

### Model providers (server side only)

Set these in `.env` for Django. The browser never sees keys; the chat shows a clear message when a provider is not set up.

| Provider | Needs | Notes |
|---|---|---|
| Local | `ollama serve` and a pulled chat model. `DOCUTRUST_OLLAMA_BASE_URL` (default `http://127.0.0.1:11434`) | Installed models are listed automatically. Nothing leaves the workspace server. |
| Gemini | `DOCUTRUST_GEMINI_API_KEY`, optional `DOCUTRUST_GEMINI_MODELS` | **No key is set in this repo.** Add yours to `.env`. Cloud provider. |
| Hosted | `DOCUTRUST_HOSTED_BASE_URL`, `DOCUTRUST_HOSTED_API_KEY`, `DOCUTRUST_HOSTED_MODELS` | Any OpenAI-compatible API. Cloud provider. |

Questions and retrieved passages are sent to Gemini and Hosted. The UI asks for confirmation when switching to them. `DOCUTRUST_AI_PROVIDER` sets the default.

### Supported files and limits

PDF (with a text layer), DOCX, Markdown and TXT, up to `uploads.max_file_mb` in `config.toml` (10 MB; override with `DOCUTRUST_MAX_UPLOAD_BYTES`) and 500 documents in total (`DOCUTRUST_MAX_DOCUMENTS`). Scanned PDFs are not OCR'd.

### Tests

```bash
.venv/bin/python -m pytest -q          # or: .venv/bin/python manage.py test tests
cd web && npm run lint && npm run build
```

## Deploy

**Frontend (Vercel).** Import the repo, set **Root Directory** to `web`, then add:

- `NEXT_PUBLIC_WORKSPACE_API_URL` — public HTTPS URL of the Django service (inlined at build time, so redeploy after changing it).
- `DJANGO_API_URL` — the same URL, used by the early-access form on the server.

**Backend (a host with a persistent disk).** Django cannot run as a Vercel function: SQLite and uploaded files need a disk that survives restarts (a VM, Fly.io volume, Render disk, Railway volume…). Set:

- `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=0`, `DJANGO_ALLOWED_HOSTS=api.example.com`
- `DOCUTRUST_CORS_ALLOWED_ORIGINS=https://your-site.vercel.app` (exact origins; the API allows no cookies)
- `DOCUTRUST_DJANGO_DB` and `DOCUTRUST_MEDIA_ROOT` pointing at the persistent disk
- provider variables from the table above

Run `python manage.py migrate` on each deploy and serve with a WSGI server such as `gunicorn docutrust_site.wsgi` using **one worker** (SQLite writers and the audit chain are serialised by the database). Terminate HTTPS in front of it. Because there is no sign-in, treat the deployment as a public demo.

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
| Landing copy | `web/src/components/landing/` |
| Workspace roles, departments and rooms | the workspace UI itself, or `workspace/seed.py` for the starting data |