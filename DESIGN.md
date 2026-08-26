# Design System: GitHub Activity Graph

## 1. Visual Theme & Atmosphere

A restrained instrument panel for a single number over time. Density sits at Daily App Balanced (5): enough air around the line that the shape can be read at README size, never a cockpit of chrome. Variance is Offset Asymmetric (7): the preview splits headline and action, the card splits title and tally, nothing is centered. Motion is Fluid CSS (4): the line draws on once with weighty spring easing, then holds still. The atmosphere is zinc-cold and quiet, like a lab bench after the equipment is put away — one jade signal, no weather, no glow.

The SVG card is the product. It must sit on GitHub's own canvas (`#0D1117` dark, `#FFFFFF` light) as if it were printed there. The preview page is a workbench around that card, not a marketing site.

## 2. Color Palette & Roles

- **Canvas Deep** (`#0D1117`) — Dark card fill. Matches GitHub's dark README surface so the embed does not float as a second rectangle.
- **Canvas Paper** (`#FFFFFF`) — Light card fill. Matches GitHub's light README surface.
- **Zinc Ground** (`#09090B`) — Preview page background. Absolute zinc, never a warm gray.
- **Zinc Surface** (`#18181B`) — Preview trays, snippet well, raised workbench panels.
- **Ink Zinc** (`#E4E4E7` dark / `#18181B` light) — Primary titles. Not pure black.
- **Muted Steel** (`#71717A`) — Subtitles, axis labels, helper copy, inactive controls.
- **Mono Mist** (`#A1A1AA` dark / `#52525B` light) — Tabular numbers: axis ticks, contribution counts, date labels. Slightly brighter than Muted Steel so 10px figures stay readable.
- **Hairline** (`rgba(113, 113, 122, 0.18)`) — Card edge, chart grid, preview dividers. One structural weight: 1px.
- **Jade Signal** (`#5B9E7E`) — The only accent. Line stroke, terminal dot, peak marker, primary button fill, focus ring, active window underline. Saturation well under 80%. No second accent.
- **Jade Wash** (`#5B9E7E` at 16% → 0%) — Area fill under the line. Supports the stroke; never competes with it.

Banned: `#000000`, purple, neon, a second accent, warm/cool gray mixing, GitHub blue (`#58A6FF` / `#0969DA`).

## 3. Typography Rules

- **Display (preview):** Satoshi — track-tight (`-0.04em`), weight-driven hierarchy (600–700), size via `clamp(2.25rem, 5.5vw, 3.75rem)`. Not screaming. Geist is banned here; it has become the default AI dashboard face.
- **Body (preview):** Satoshi — relaxed leading (1.45), 65ch max on ledes. Color is Muted Steel unless the line is a title.
- **Mono (preview):** JetBrains Mono — snippets, window numerals, copied markdown. Tabular figures.
- **Display (SVG card):** `ui-sans-serif, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif` at 15px / weight 600 / `-0.01em`. GitHub camo serves the SVG as an image, so webfonts will not load. Hierarchy is weight and Ink Zinc, not size.
- **Mono (SVG card):** `ui-monospace, "SF Mono", Menlo, Consolas, monospace` at 10–11px for every number and the uppercase tally (`350 CONTRIBUTIONS · 31 DAYS`). Letter-spacing `0.08em` on the tally only.
- **Banned:** Inter, Geist. Generic serifs. Serif anywhere in this UI. Variable webfonts inside the SVG.

## 4. Component Stylings

- **Embed card:** 840×320. Corner radius 12px — enough to soften the README slot, not a pill. Default edge is Hairline; `hide_border=true` removes it. Interior: title left, tally right, one mid grid + baseline, jade line, terminal ring, peak value.
- **Buttons:** Flat Jade Signal fill, Ink-on-jade (`#09090B` text). No outer glow. Tactile `translateY(1px)` on active. Minimum 44px tall. Ghost/underline links for secondary choices (theme, border).
- **Cards / trays:** Preview well uses 1.25rem radius and a shadow tinted to Zinc Ground (`rgba(9, 9, 11, 0.45)`). Elevation exists only to seat the SVG. High-density rows (window picker, theme/border) use hairlines and space, not extra cards.
- **Inputs:** None on this surface. Theme, window, and border are link choices with the label above the row.
- **Window picker:** Left-aligned inline row of 31 / 90 / 365. Active state is Jade Signal ticks as an underline, not a filled equal-width column. Tick density increases with the window. Banned: three equal columns.
- **Snippet:** JetBrains Mono on Zinc Surface, Hairline border, 12px padding. The copy button sits in the hero, not inside the code well.
- **Loaders:** The SVG itself is the pending state — skeletal layout is the chart grid, then the line draws on. No circular spinners on the preview.
- **Empty / error:** Same card chrome. Left-aligned title in Ink Zinc, message in Mono Mist. No centered shout, no illustration.
- **Focus:** 2px Jade Signal ring, 3px offset. Never a custom cursor.

## 5. Layout Principles

Grid-first. Preview max-width 1080px, centered, with `clamp(3rem, 8vw, 6rem)` vertical gaps. Hero is a two-column split (headline | lede + one CTA), never centered. The inline sparkline in the headline sits at cap-height between the two words, rounded, in its own spatial zone — no overlap. The stage stacks well then window row; the deck below is two fields then a full-width snippet. CSS Grid only; no `calc()` percentage hacks. Full-height shell uses `min-height: 100dvh`.

**Responsive:** Below 768px every multi-column grid collapses to one column. No horizontal overflow. Headlines keep `clamp()`. Body text minimum 1rem. Interactive targets minimum 44px. The inline sparkline drops under the first word rather than squeezing the headline. Desktop nav is the window row; it wraps, it does not become a hamburger.

## 6. Motion & Interaction

Spring-ish easing `cubic-bezier(0.16, 1, 0.3, 1)`, stiffness analogue of 100 / damping 20. The card line draws on over 1.1s via `stroke-dashoffset` (transform-equivalent; the geometry does not animate). Active window ticks hold a slow opacity pulse (2.8s). The headline sparkline shimmers its stroke once on load. Copy button has no hover glow — brightness is banned; hover is a 4% mix toward Canvas Paper. Animate `transform` and `opacity` only.

`prefers-reduced-motion: reduce` cancels the draw-on (path renders complete), the sparkle, and the tick pulse. Active-state `translateY` is also removed.

## 7. Anti-Patterns (Banned)

- No emojis anywhere
- No Inter, no Geist
- No generic serifs; no serif in this UI
- No pure black (`#000000`)
- No neon or outer-glow shadows
- No oversaturated accents; no second accent; no GitHub blue
- No gradient text on headers
- No custom mouse cursors
- No overlapping elements
- No 3-column equal card or ruler layouts
- No generic names ("John Doe", "Acme", "Nexus")
- No fake round numbers or invented metrics — only counts that came from the GitHub payload
- No "SYSTEM PERFORMANCE" / "BY THE NUMBERS" filler sections
- No `LABEL // YEAR` typography
- No AI copy ("Elevate", "Seamless", "Unleash", "Next-Gen")
- No "Scroll to explore", swipe hints, bouncing chevrons
- No broken Unsplash links
- No centered hero
- No webfonts inside the SVG card
