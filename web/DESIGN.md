# DocuTrust AI web: design rules

Next.js 16 (App Router), React 19, Tailwind 4, GSAP. Read `node_modules/next/dist/docs/` before using a Next API you are unsure of: this version differs from older ones (`proxy.ts` replaces middleware, `cacheComponents` is on, so anything reading `searchParams`/`useSearchParams` needs a `<Suspense>` boundary).

## Direction

- Product: a private document assistant for one team. Answers come only from files each person may open, with the source attached, and every action is written to a tamper-evident log.
- Character: calm, exact, accountable. The place it belongs to is a records room.
- Two themes only. **Liquid black** (dark) and its opposite, **white** (light). No accent colour: the ink colour is the accent. Primary buttons invert (ink fill, page-coloured text).
- The one signature detail is the citation tag: `Cite` / `.cite`, a hairline-boxed mono label such as `leave-policy.pdf | 3`. Use it wherever a source is named, and nowhere else.

## Tokens (Tailwind class names)

| Use | Classes |
|---|---|
| Page, alternate band, card, raised/input, hover | `bg-bg`, `bg-deep`, `bg-surface`, `bg-raised`, `bg-hover` |
| Hairline, stronger hairline | `border-line`, `border-line-strong` |
| Text: primary, secondary, muted | `text-ink`, `text-ink-2`, `text-ink-3` |
| Inverted fill (primary button, selected chip) | `bg-ink text-on-ink` (hover `bg-ink-hover`) |
| Semantic only | `text-ok` (verified), `text-danger`, `bg-danger-soft`; highlight `bg-mark` |
| Shadow | `shadow-window` on floating windows and modals only |

Fonts: `font-sans` (Geist) for the interface, `font-serif` (Newsreader) for page titles and display type only, `font-mono` (Geist Mono) for IDs, hashes, timestamps, citation tags. Weights 400 and 500 only. Sizes 12, 13, 14, 15, 16, 18. Numbers use `tabular-nums`.

## Hard rules (the "no slop" list)

- No glow, no coloured or blurred shadows, no gradients (a tone step inside one neutral is the only exception), no glass, no neon, no emoji, no sparkle, no italic emphasis.
- No small label above a heading, no uppercase or wide-tracked labels. Titles are sentence case. Page titles use `PageHeader`; headings inside a page are plain `text-[16px] font-medium`.
- 4px grid for every margin, padding, gap and fixed size. Same thing, same size (every row in a list has one height).
- Radius: controls and buttons 10, cards 16, windows and modals 20, tags and keycaps 6. Inner radius is outer minus padding.
- Icons: lucide, `size-[18px]` (16 in dense rows), `strokeWidth={1.5}`, coloured by text role.
- Copy: short, specific, no exclamation marks, no "Welcome back", no hype words. Labels have no trailing full stop. Changes say what they compare to.
- Hover and focus states always exist and stay inside the palette; keyboard focus is drawn globally.

## Motion (must never get in the way of reading)

- Content is visible at rest. Animation is an enhancement: entrances of 8 to 16px with fade, 0.3 to 0.7s, `ease-soft` or GSAP `power3.out`; staggers under 0.08s per item.
- Animate only `transform`, `opacity`, colours. Never width, height, top, left, margin or large blurs. To open or close a panel animate `grid-template-rows` between `0fr` and `1fr`.
- CSS transitions name their properties (`transition-colors`, `transition-[transform,opacity]`), never `transition-all`. Durations 150 (feedback), 300 (state), 500 to 700 (entrance).
- No looping motion except a spinner while loading.
- Use `useGSAP` from `@gsap/react` with a `scope` and `dependencies`, and wrap tweens in `gsap.matchMedia()` with `"(prefers-reduced-motion: no-preference)"` so nothing animates for people who ask for less motion. `animate-[rise-in_320ms_var(--ease-soft)_both]` is a ready-made CSS entrance.
- Streaming text and live results sit in an `aria-live="polite"` region.

## Building blocks

- `@/components/ui/Button`: `Button` (`variant` primary | secondary | ghost | danger, `size` sm | md | lg | icon, `loading`), `buttonStyles()` for links styled as buttons.
- `@/components/ui/Field`: `Field` (label, hint, error; its `htmlFor` must equal the control's `id`), `Input`, `Textarea`, `Select`.
- `@/components/ui/Segmented`, `Modal` (native `<dialog>`; Escape, focus trap and focus return are built in), `Cite`, `Spinner`, `Toast` (`useToast().notify("Saved")`, `notify(message, "error")`).
- `@/components/workspace/ui`: `Page` (padded, centred body), `PageHeader`, `Card`, `EmptyState`, `ErrorNote`, `Avatar`, `Tag`, `Skeleton`, `ConfirmModal`.
- `@/components/motion/TransitionLink` (use it for every internal link) and `useTransitionRouter().go(href)` for programmatic navigation.
- `@/lib/cn` joins class names.

## Data

- `useWorkspace()` from `@/components/workspace/WorkspaceContext` gives `{ boot, persona, request, refresh, error }`. `boot` holds the signed-in user, `capabilities`, members, departments, roles, the permission catalogue, the model catalogue and limits. It is `null` until the first response, so handle that.
- `request<T>(path, { method, json, signal })` calls `/api/workspace<path>` as the Administrator. `useResource(load)` from `@/hooks/useResource` loads and reloads data.
- `@/lib/workspace-api` holds every API type and the helpers `formatBytes`, `formatDateTime`, `formatWhen`, `formatTime`, `initials`, `errorMessage`, `uploadRequest`, `downloadDocument`.
- Sign-in is open in this demo and everyone is the Administrator with full control. There is no persona switcher.

## Layout

Screens render inside the shell's scroll container. Ordinary screens wrap their content in `<Page>`. Chat-like screens that fill the height use a root of `h-[calc(100dvh-3.5rem)] min-h-[520px]` (the top bar is 56px). Everything works from 360px wide upward; two-pane screens show one pane at a time below `lg` with a back button.

## Files

`src/app/workspace/<route>/page.tsx` is a thin file that renders a client view from `src/components/workspace/<area>/`. Wrap views that call `useSearchParams` in `<Suspense>`.
