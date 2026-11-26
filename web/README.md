# DocuTrust AI web

Next.js 16 front end: the website, the sign-in page and the workspace (overview, AI chat, team chat, documents, notes, announcements, people and roles, audit log). It talks to the Django service in the repository root. Design rules, tokens and motion rules are in [DESIGN.md](DESIGN.md).

> **Public demo, open sign-in.** The sign-in page only starts a browser session and everyone enters as the seeded Administrator. Use synthetic data only.

## Local development

Prerequisites: Node 20.9 or newer and the Django service on `127.0.0.1:8300` (see the root README).

```bash
npm install
cp .env.example .env.local
npm run dev -- --hostname 127.0.0.1 --port 3100
```

Open <http://127.0.0.1:3100>. Without Django the website still works; the workspace shows a connection error with a retry button.

## What it is built with

| Piece | Choice |
|---|---|
| Framework | Next.js 16 App Router, React 19, TypeScript |
| Styling | Tailwind 4 with CSS variable tokens (`src/app/globals.css`) |
| Animation | GSAP (ScrollTrigger, SplitText), Lenis smooth scrolling on the website only |
| Backgrounds | Live WebGL contour field (`components/field/LiquidField.tsx`), no image files |
| Themes | `next-themes`; the switch spreads out from the button using the View Transitions API |
| Fonts | Geist, Geist Mono and Newsreader, bundled locally |

Everything animated respects `prefers-reduced-motion`, and every animation is an enhancement over content that is already readable.

## Environment

| Variable | Used by | Purpose |
|---|---|---|
| `NEXT_PUBLIC_WORKSPACE_API_URL` | browser (inlined at build time) | Base URL of the Django service for `/api/workspace/`. Falls back to `http://127.0.0.1:8300` in development only. |
| `DJANGO_API_URL` | Next.js server | Early-access form submissions. |

## Checks

```bash
npm run lint
npm run build
```
