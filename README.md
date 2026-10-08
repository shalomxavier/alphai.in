# ALPHAI — alphai.in

Official marketing website for ALPHAI. Premium, minimal, dark-first static site.

## Stack

- **Astro 7** — static output, `ClientRouter` view transitions
- **Tailwind CSS 4** — CSS-first config in `src/styles/global.css` (`@theme` tokens)
- **GSAP 3 + ScrollTrigger** — declarative reveals via `data-animate` attributes
- **TypeScript** — strict (`astro/tsconfigs/strict`)
- **Netlify** — deploy target (`netlify.toml`, not yet deployed)

## Commands

```bash
npm install        # install dependencies
npm run dev        # dev server → http://localhost:4321
npm run build      # production build → dist/
npm run preview    # preview the production build
npm run check      # astro check (types + diagnostics)
```

## Structure

```
src/
├── layouts/BaseLayout.astro   # html shell: head/meta, Nav, slot, Footer, ClientRouter
├── components/
│   ├── Nav.astro              # wordmark + links, mobile menu, aria-current
│   ├── Footer.astro
│   ├── Section.astro          # vertical rhythm wrapper + optional mono label
│   └── ServiceRow.astro       # homepage horizontal service row
├── pages/                     # index, about, testimonials, contact
├── scripts/motion.ts          # GSAP foundation (reduced-motion gated)
└── styles/global.css          # tokens, type scale, base styles
```

## Conventions

- **Tokens over literals**: use `bg-ink`, `text-paper`, `text-muted`, `text-accent`,
  `hairline` borders, `py-section`, `shell`, `label` — not raw hex/px.
- **Type scale**: `text-display`, `text-h1..h3`, `text-body-lg`, `label` class.
- **Animation**: add `data-animate="fade-up|fade-in|stagger"` (+ optional
  `data-animate-delay`) to elements; motion.ts handles the rest and is fully
  disabled under `prefers-reduced-motion`.
- **Copy**: all marketing copy is placeholder until the brand narrative is decided.
  Services are `SERVICE 01/02/03` placeholders defined in `src/data/services.ts` —
  each entry's `href` can later become a dedicated page or section without
  component changes.

## Production content checklist

Everything below is **placeholder** and must be supplied before launch:

| Area | Location | Needs |
|---|---|---|
| About — Belief statement | `src/pages/about.astro` (h2 + paragraph, marked `Placeholder —`) | Final philosophy copy |
| Testimonials ×3 | `src/data/testimonials.ts` | Real quote, client name, role, company, service ref per entry |
| Service destinations | `src/data/services.ts` (`href`) | Final targets (pages or sections) — all currently `/about` |
| Meta descriptions | `BaseLayout` `description` prop per page | Draft copy in place; refine with final brand voice |
| Accent color | `global.css` `--color-accent: #d5f34e` | **Provisional** — real brand color, decided in visual design phase |
| OG image | `public/og.png` | Generated via `npm run og` from `scripts/generate-og.mjs` — regenerate when brand assets exist |
| Favicon | `public/favicon.svg` | Temporary "A" monogram — replace with real mark |

Not yet decided/provided: brand wordmark asset, positioning tagline,
company details (location, socials — none claimed in metadata until supplied).

## Design tokens

| Token | Value | Notes |
|---|---|---|
| `ink` | `#0a0a0b` | page background |
| `paper` | `#eceae4` | primary text |
| `muted` | `#8f8e89` | secondary text |
| `line` | paper @ 12% | hairline borders |
| `accent` | `#d5f34e` | **provisional** — do NOT treat as brand color; final color decided in visual design phase |
| `font-sans` | Space Grotesk Variable | self-hosted via Fontsource |
| `font-mono` | JetBrains Mono Variable | labels/eyebrows |
