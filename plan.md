# DocuTrust AI — Project Plan

Agreed on 2026-11-22. This file is the single source of truth for scope, design and build order.

## Project direction

DocuTrust AI is a final-year project: a private, local-first document assistant for one team. Employees upload policies and notes, ask questions, and get answers only from documents they are allowed to see — with citations, or a refusal when the evidence is weak. Every upload, question, share and administrative change is written to a tamper-evident activity ledger.

Constraints:

- Public website in `web/` (Next.js, React, Tailwind, GSAP), changed on 2026-11-23. Django is the backend: it stores data, serves the API at `/api/` and runs the admin. Fonts and scripts are bundled locally, nothing loads from a CDN.
- Runs offline by default on SQLite and a local Ollama service. No account, subscription or cloud dependency.
- Minimalist interface that a beginner can edit: one stylesheet, wording and settings in TOML files.
- Original work. No code, assets, text, branding or sample material from any other product.
- Honest labelling: planned features are never presented as working ones.

## Agreed scope

Weights are effort points out of 100 for the features below.

| Section | Feature | Points | % |
|---|---|---|---|
| **Welcome** | | **6** | **6%** |
| | Landing content: hero, sample preview, 4 feature cards, 3 role cards | 5 | 5% |
| | Public demo/status dashboard | 1 | 1% |
| **Login** | | **6** | **6%** |
| | Sign-in and 3 roles (employee, department, administrator) | 4 | 4% |
| | 5 failed attempts → 15 minute lockout; disabled-account message | 2 | 2% |
| **Documents** | | **21** | **21%** |
| | Upload `.txt .md .pdf .docx`, 10 MB max, 50 documents per user, indexing status | 9 | 9% |
| | PDF and DOCX text extraction | 4 | 4% |
| | 500-character chunks with 80 overlap, local embeddings, chunk count | 6 | 6% |
| | Warning when the embedding model changes and documents need re-indexing | 2 | 2% |
| **Ask** | | **32** | **32%** |
| | Hybrid search: BM25 0.3 + vector 0.7, top 4 chunks, minimum score 0.15 | 7 | 7% |
| | Permission filter before ranking: own + department + explicitly shared | 7 | 7% |
| | Answer with inline citations `[filename \| chunk N]` | 6 | 6% |
| | Refusal when the documents do not contain the answer | 4 | 4% |
| | Same language as the question (English / Roman Urdu) and prompt-injection guard | 2 | 2% |
| | Streaming answers | 4 | 4% |
| | Answer rating and response time stored | 2 | 2% |
| **Shared** | | **10** | **10%** |
| | Share one document with one teammate, revoke at any time | 6 | 6% |
| | Shared With Me page | 2 | 2% |
| | Optional expiry date on a share | 2 | 2% |
| **Audit** | | **10** | **10%** |
| | Append-only activity trail | 3 | 3% |
| | SHA-256 hash chain and integrity verification | 5 | 5% |
| | Filters | 1 | 1% |
| | CSV export | 1 | 1% |
| **Admin** | | **6** | **6%** |
| | User management: add, roles, departments, disable | 4 | 4% |
| | Usage and Q&A statistics | 2 | 2% |
| **Dashboard** | | **5** | **5%** |
| | Live counts (users, documents, audit events) | 3 | 3% |
| | Recent audit activity | 2 | 2% |
| **Quality** | | **4** | **4%** |
| | Doctor checks and local launcher | 1 | 1% |
| | Tests | 2 | 2% |
| | Documentation and plan | 1 | 1% |
| **Total** | | **100** | **100%** |

## Committed additions (outside the 100 points)

These were agreed separately and are part of the build:

| Addition | Notes |
|---|---|
| Department and Team records | The source design only had a free-text department field. One department and one team per user; documents are scoped by department. |
| Django admin | Used for user, role, department and team management instead of a custom admin console. Less code, easier to explain. |
| Gemini chat provider (optional) | Chat provider switch in config; embeddings always stay local. The interface must disclose when cloud chat is active. |
| Ask history | Each user can see their previous questions and answers on the Ask page. |
| Contact form | Split contact page; messages are stored locally and listed in Django admin. No email delivery. |

## Out of scope

- Attendance: daily code, QR image, monthly view, holidays, strikes, freezing.
- Multi-tenancy, partner or cross-company sharing, billing or plans, document generation.
- OCR, PPTX or CSV ingestion, extra languages beyond English and Roman Urdu.
- Five AI providers, cloud deployment, mobile API, user-data migration.
- Team chat: deferred to M4, only if M1–M3 finish early. Not promised to the panel.

## Interface direction

The public site is a dark product page in the language of a hardware launch: graphite surfaces, one teal signal, large type, and the product itself shown working.

Direction in five lines:

- **Product.** A private document desk where one team asks its own files and gets a cited answer or a refusal.
- **Character.** Precise, technical, confident.
- **World.** A dark product stage: graphite panels, thin rules, a single teal signal.
- **Moments.** The live product view in the hero and the question switcher in the demo.
- **Signature.** The monospace finding reference and the teal verdict stamp (`SOURCED`, `NO SOURCE`).

Theme: dark by default, with light and system available from the navigation switch. The choice is stored and applied before first paint.

Palette:

| Role | Dark | Light |
|---|---|---|
| Page | `#18181a` | `#f4f4f2` |
| Panel | `#242428` | `#ffffff` |
| Raised | `#2c2c31` | `#e9e9e5` |
| Primary text | `#f3f3f4` | `#161618` |
| Secondary text | `#a5a5ad` | `#57575e` |
| Muted text | `#73737b` | `#7a7a82` |
| Accent | `#2fbfc5` | `#0f7a80` |
| Danger | `#e06c6c` | `#b23b3b` |

Type, bundled locally with no CDN: Space Grotesk for display, IBM Plex Sans for interface text, IBM Plex Mono for references, hashes and small labels. Fallbacks keep the page readable if a font fails.

Layout:

- Sticky 68px header with six section links, theme switch and one primary action.
- 1240px container, 88px section rhythm, 4px spacing scale, radii 8 for controls, 12 for panels, 14 for product frames.
- Hero split: copy on the left, a working product frame on the right.
- Alternating feature rows, a four-column stack grid, tabbed data panels, a specification table and a details-based FAQ.

Sections, in order: hero, interactive demo, product, stack, data, specs, FAQ, closing call to action.

Interactions: the demo switches between two cited answers and one refusal; the data section switches between stored, shared and recorded; the mobile navigation collapses; the current section is marked in the navigation; sections reveal on scroll. Motion is transform and opacity only, one easing curve, disabled under `prefers-reduced-motion`. No loops, parallax or decorative glow.

Anti-slop rules for this project:

- No gradients, glows, gradient text, glassmorphism, purple palettes, emoji labels or badge spam.
- No fake metrics, testimonials or sample counts presented as live data.
- One accent, one radius family, one rich element per screen.

Page map:

```
/                  public product page and interactive demo
/demo/             public status page (no user data)
/contact/          contact form (stored locally)
/login/            sign in
/overview/         workspace dashboard
/ask/              ask and findings
/files/            document rows, upload and index status
/shared/           documents shared with me
/ledger/           audit trail and verification
/admin-panel/      usage statistics (user management is Django admin)
```

## Architecture

```text
DocuTrust/
├── docutrust_site/        settings, URLs, WSGI/ASGI
├── accounts/              User, Department, Team; Django admin registration
├── library/               Document, Chunk, Share, ChatMessage; ingest, retrieval, views
├── ledger/                AuditLog; append and verify helpers
├── site_pages/            public landing, contact and demo views
├── templates/             editable Django templates
├── static/
│   ├── css/site.css       single design-system stylesheet
│   └── vendor/bootstrap/  local Bootstrap, navigation behaviour only
├── core/                  TOML loading, AI provider adapter, legacy SQLite helpers
├── prompts/               answer and refusal prompt templates
├── data/docutrust_django.sqlite3  Django development database
├── tests/
├── doctor.py
├── manage.py, run.sh
└── plan.md
```

The legacy Streamlit shell (`app.py`, `pages/`) and `data/docutrust.db` stay in the repository untouched, but are not part of the demo path or the new navigation.

Business logic lives in small helpers, not in templates:

- `core/ai.py` — chat and embedding provider adapter.
- `library/ingest.py` — extract, chunk and embed.
- `library/retrieval.py` — permission filter and hybrid ranking.
- `ledger/chain.py` — append and verify.

## Data model

- `accounts.User` (extends `AbstractUser`): `role`, `department`, `team`.
- `accounts.Department`: `name`, `code`.
- `accounts.Team`: `name`, `department`.
- `library.Document`: `owner`, `department`, `filename`, `file_type`, `visibility` (private/department), `status` (indexing/ready/failed), `embed_model`, `chunk_count`, `created_at`.
- `library.Chunk`: `document`, `chunk_index`, `content`, `embedding`, `token_count`.
- `library.Share`: `document`, `shared_with`, `shared_by`, `expires_at`, `created_at`.
- `library.ChatMessage`: `user`, `question`, `answer`, `sources_json`, `refused`, `rating`, `response_ms`, `created_at`.
- `ledger.AuditLog`: `created_at`, `username`, `action`, `target`, `details`, `prev_hash`, `row_hash`.
- `site_pages.ContactMessage`: `name`, `email`, `message`, `created_at`, `handled`.

Access rule, in one sentence: an employee sees their own documents, their department's documents and documents explicitly shared with them; a department user sees their department; an administrator sees everything. The filter runs before ranking, never after.

## AI behaviour

- Embeddings are always local (`nomic-embed-text`) so switching chat providers never breaks the index.
- Chat provider is set in `config.toml`: `ollama` (default) or `gemini`. The Gemini key is read from `GEMINI_API_KEY`; no key is stored in the repository.
- Retrieval: 500/80 chunks, top 4, BM25 0.3 + vector 0.7, refuse below 0.15.
- Prompts in `prompts/` answer only from context, cite every fact, treat document text as untrusted data, reply in the question's language, and return the refusal message when evidence is missing.

## Audit ledger

Actions recorded: sign-in success, failure and lockout; upload; indexing complete or failed; question asked; answer refused; share granted or revoked; administrative user change.

Each row stores the previous row's hash; verification recomputes the chain and reports the first broken row. Filters cover user, action and date. CSV export uses the same filters.

## Milestones

| Milestone | Work | Done when |
|---|---|---|
| **M1 — Shell and people** | New base template and `site.css`; redesigned landing, `/demo/` and `/contact/`; Department and Team models with user links; authentication, roles, lockout, disabled accounts; Django admin configured; attendance copy and config removed | Migrations apply; admin can create department, team and user; lockout and role checks pass tests; all three public pages render at `127.0.0.1:8300` |
| **M2 — Library and ask** | Upload, extraction, chunking, embeddings, status, re-index warning; hybrid retrieval with permission filter; citations, refusal, streaming, ratings, history; Gemini adapter | A PDF upload can be asked about and returns a cited answer; an unrelated question is refused; a second user cannot retrieve a private document; Gemini works when enabled |
| **M3 — Trust** | Sharing, revocation, expiry, Shared With Me; audit append, filters, verification, CSV; dashboard counts and recent activity; usage statistics | A share is visible only to the recipient; editing an audit row fails verification; CSV export matches filters |
| **M4 — Optional** | Team chat: `TeamMessage`, one page per team, manual refresh. No WebSockets, no Redis | Two members of a team see each other's messages; non-members are blocked |

## Cleanup required in M1

These still describe features that are no longer in scope:

- `texts.toml`: `card_3` (daily code attendance), `role_1` ("check in daily"), `role_3` ("generate attendance codes, review strikes").
- `config.toml`: the `[attendance]` block and `qr_enabled`.
- Legacy `pages/4_Attendance.py` and `pages/6_Admin.py` must not be linked from the new interface.
- Legacy tables `attendance_records`, `holidays`, `user_strikes` stay in the old database only and are not migrated.

## Honesty rules

- The public landing and demo pages state which capabilities are implemented and which are planned.
- Dashboard numbers come from the database; no placeholder metrics, testimonials or sample counts.
- The offline badge is conditional: with Gemini enabled it must say that questions are sent to a cloud provider.
- Nothing in the interface advertises attendance, strikes or team chat before those exist.
- The contact form states that messages are stored locally for the demo, not emailed.

## Running locally

`./run.sh` starts the Django development server on loopback only at <http://127.0.0.1:8300>. Port 8300 avoids a service already using 8000 on this machine. The first run creates `.venv` and installs `requirements.txt`. Ollama is optional for viewing public pages but required for asking questions.

The Django database is `data/docutrust_django.sqlite3`, configurable with `DOCUTRUST_DJANGO_DB`. The legacy `data/docutrust.db` is never used by Django.

## Verification

- `python manage.py check` and migrations on the separate Django database.
- `pytest` — existing public-site tests plus new tests per milestone: roles, lockout, permission filtering, refusal, hash chain, sharing.
- `doctor.py` — project files, dependencies and optional Ollama status.
- Routes `/`, `/demo/`, `/login/` and local static assets return 200; `ss` confirms loopback-only binding.
- Baseline before the redesign: 15 tests passed on 2026-11-16.

## Independence and originality

- This repository is standalone and private until submission, with its own dated commit history.
- No files, prompts, sample documents, screenshots, wording or branding are copied in from any other project.
- Separate database, credentials and API keys from any other application.
- The report and demo present this project on its own terms; no other product is named or used as a reference.
- Submission packages exclude `.venv`, `data/*.sqlite3`, caches and local tool folders.