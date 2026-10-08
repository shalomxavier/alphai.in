# AGENTS.md

## Commands

- Dev: `npm run dev` (localhost:4321)
- Build: `npm run build` → `dist/` (static)
- Typecheck: `npm run check`

## Conventions

- Tailwind v4 CSS-first config — all design tokens live in `@theme` in
  `src/styles/global.css`. No `tailwind.config.js`.
- Use semantic tokens (`ink`, `paper`, `muted`, `line`, `accent`) and utility
  classes (`shell`, `label`, `hairline`, `py-section`) — never raw colors/px
  in markup.
- Reveal animations are declarative: `data-animate="fade-up|fade-in|stagger"`,
  optional `data-animate-delay`. All motion must respect
  `prefers-reduced-motion` (handled centrally in `src/scripts/motion.ts`).
- The ambient particle field is a singleton Canvas 2D engine in
  `src/scripts/particles.ts`, mounted on a persisted `<canvas id="field">` in
  `BaseLayout`. Under `prefers-reduced-motion` it renders one static frame —
  no RAF loop, no input listeners.
- Pages must use `BaseLayout` and pass a `title` prop.
- All marketing copy is intentionally placeholder — do not invent real copy.
  Service names/destinations are placeholders configured in
  `src/data/services.ts` (per-service `href`, no component changes needed later).
- `accent` (`#d5f34e`) is a provisional placeholder, NOT the brand color — do not
  build visual identity around it. Final color decided in the visual design phase.
- Deploy target is Netlify (`netlify.toml`); no SSR adapter — keep output static.
