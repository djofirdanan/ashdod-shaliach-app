# Homepage (Unauthenticated Landing) Redesign — Design Spec

**Date:** 2026-04-17
**Project:** Ashdod Shaliach / ZOOZ admin-panel
**Scope:** Replace the current login-first `/` with a full public marketing landing page, and restyle the auth pages (`/login`, `/register`, `/forgot-password`, `/reset-password`) to a new "Editorial Light" visual language.

---

## 1. Goal

Today the root URL `/` redirects unauthenticated visitors straight into a login form. ZOOZ now has a public story to tell — businesses can sign up, couriers can apply, and the brand needs a home on the web. This redesign introduces a dedicated marketing landing page at `/` and aligns the auth flow with a new, more distinctive visual tone.

## 2. Decisions (from brainstorm)

- **Scope:** Full landing page (6–10 viewports) + refreshed auth pages. Login stays a dedicated `/login` route (not a drawer/modal).
- **Audience:** Balanced dual audience (businesses + couriers), equal weight.
- **Hero pattern:** Toggle hero — a single hero with a `לעסקים` / `לשליחים` tab that swaps content in place.
- **Visual language:** Editorial Light — warm off-white canvas, serif-italic accents, sharp corners, confident typography, minimal gradients.
- **Language:** Hebrew only (RTL). No i18n layer introduced.
- **Brand name:** "ZOOZ" retained.

## 3. Architecture

### 3.1 Routing

**Current (`admin-panel/src/App.tsx`):**
- `/` → `<Navigate to="/login" />` for unauthenticated users.

**New:**
- `/` → renders `<Landing />` for unauthenticated users. Authenticated users continue to redirect to their role-specific dashboard (`/dashboard`, `/business/dashboard`, `/courier/dashboard`).
- `/login`, `/register`, `/forgot-password`, `/reset-password`, and `/djf-2691` remain as dedicated routes with identical URLs.

### 3.2 New files

```
admin-panel/src/pages/Landing.tsx                       # Orchestrator for the landing page
admin-panel/src/components/landing/LandingNav.tsx       # Sticky top nav
admin-panel/src/components/landing/Hero.tsx             # Toggle hero (business/courier tabs)
admin-panel/src/components/landing/HowItWorks.tsx       # 3-step process
admin-panel/src/components/landing/BusinessSection.tsx  # Business-side value props + screenshot
admin-panel/src/components/landing/CourierSection.tsx   # Courier-side value props + screenshot
admin-panel/src/components/landing/Coverage.tsx         # Ashdod service-area map
admin-panel/src/components/landing/SocialProof.tsx      # Stats strip + testimonials
admin-panel/src/components/landing/FAQ.tsx              # Accordion
admin-panel/src/components/landing/FinalCTA.tsx         # Dual-path closer
admin-panel/src/components/landing/LandingFooter.tsx    # Site footer
admin-panel/src/components/landing/content.ts           # Hebrew copy, stats, testimonials, FAQ items
```

### 3.3 Modified files

- `admin-panel/src/App.tsx` — change `/` route target.
- `admin-panel/src/pages/Login.tsx` — restyle to Editorial Light; structure and auth logic unchanged.
- `admin-panel/src/pages/Register.tsx` — restyle only.
- `admin-panel/src/pages/ForgotPassword.tsx` — restyle only.
- `admin-panel/src/pages/ResetPassword.tsx` — restyle only.
- `admin-panel/tailwind.config.js` — add `canvas` color token (`#fbfaf6`) and a `serif` font family fallback if not present.

### 3.4 No backend changes

Landing is fully static. Auth endpoints and token flow are unchanged.

## 4. Visual language — Editorial Light

### 4.1 Color tokens

| Token | Hex | Usage |
|---|---|---|
| Canvas | `#fbfaf6` | Landing background, auth page background |
| Ink | `#111111` | Primary text, dividers on landing |
| Ink-muted | `#555555` | Secondary text |
| Border | `#e8e6dc` | Subtle hairlines on canvas |
| Primary | `#533afd` | Primary CTA buttons, focus rings |
| Accent | `#ea2261` | Serif-italic accent words, underline highlights |
| Card-white | `#ffffff` | Form cards, elevated surfaces on canvas |

Existing tailwind palette stays; new tokens added as `canvas`, `ink`, `ink-muted`, `border-editorial`.

### 4.2 Typography

- **Serif (new for accents):** `font-serif` tailwind utility mapped to `Georgia, "Times New Roman", serif` — system-available, no web font load.
  - Used for: landing headlines, accent italic words, section titles on the landing page.
- **Sans (existing):** `Noto Sans Hebrew` — body, UI chrome, auth forms.
- **Scale (landing):** h1 48–64px (clamp), h2 32–40px, h3 20–24px, body 15–16px.
- **Italic accents:** inline `<em>` styled with Georgia italic + `color: #ea2261`.

### 4.3 Shape and rhythm

- **Corners:** 4px on buttons and inputs (sharp, editorial). 8px on content cards (tiles, testimonial cards, form cards). Zero radius on full-bleed section dividers.
- **Borders:** 1px hairlines in `#111` for top/bottom rules on key sections; `#e8e6dc` for subtle separators.
- **Gradients:** Reserved for primary CTA button (`linear-gradient(135deg, #533afd, #3d22e0)`) only. Zero gradients in backgrounds or cards.
- **Shadows:** Minimal. One-level shadow on floating cards (`0 1px 2px rgba(17,17,17,.04), 0 8px 24px rgba(17,17,17,.06)`).

### 4.4 Iconography

Per global rule: **Phosphor Icons only** (`@phosphor-icons/react`, already installed). No emoji, no Heroicons in new files.

## 5. Page sections

### 5.1 LandingNav (sticky, 64px)

- Left (RTL-right): "ZOOZ" wordmark (small, serif).
- Center / right: text anchor links — `איך זה עובד` · `לעסקים` · `לשליחים` · `שאלות נפוצות`.
- Far left (RTL-left): `כניסה` link to `/login`, with a subtle outlined `הצטרפות` button (opens role modal → routes to `/register` with preselected role).
- Becomes `bg-canvas/90` with `backdrop-filter: blur(12px)` on scroll.
- Mobile: collapses to hamburger sheet.

### 5.2 Hero (toggle)

- **Layout:** Single centered hero, ~80vh on desktop, auto-height on mobile.
- **Toggle:** Pill switch at top (`לעסקים` / `לשליחים`) styled as editorial — underline-on-active, not filled background.
- **Headline:** Serif, with one italic accent word in `#ea2261`. Two versions:
  - Business: `המשלוח <em>המקומי</em> שלך. מהיר. אנושי.`
  - Courier: `נהיגה <em>לקצב</em> שלך. עבודה שמכבדת את הזמן.`
- **Sub:** 1 line, ink-muted. Two versions keyed to tab.
- **CTAs:** Primary (`הצטרפות` → `/register?role=<business|courier>`) + secondary (`איך זה עובד` → anchor scroll to `#how-it-works`).
- **Proof strip (bottom of hero):** 3 stats separated by bullets (e.g., `500+ עסקים · 12,000+ משלוחים · דירוג 4.9`). **Placeholder until confirmed** — see §9.
- Subtle horizontal rule at bottom (`1px solid #111`).

### 5.3 HowItWorks

- Shared for both audiences (no tab).
- 3 numbered steps across, each with a Phosphor icon, title, 1-line description.
  1. `01 / העסק פותח משלוח` — icon: `Storefront`.
  2. `02 / שליח מקבל ואוסף` — icon: `MotorcycleIcon` (or `Truck`).
  3. `03 / הלקוח מקבל בזמן` — icon: `PackageCheck` (or `CheckCircle`).
- Desktop: 3 columns. Mobile: vertical stack with connecting hairline.

### 5.4 BusinessSection (`#for-businesses`)

- Section label: small uppercase `לעסקים · FOR BUSINESSES`.
- Serif headline + sub.
- 4 value-prop tiles in a 2×2 grid:
  - מהירות (speed) — avg pickup time
  - שקיפות (transparency) — real-time tracking
  - שליטה (control) — dashboard, chat, reports
  - גמישות (flexibility) — on-demand, no commitment
- Inline screenshot of business dashboard (placeholder `img` with alt text; replace with real screenshot later).
- Inline secondary CTA: `הצטרפות כעסק →`.

### 5.5 CourierSection (`#for-couriers`)

- Mirror of BusinessSection, tuned for couriers.
- 4 tiles: הכנסה גמישה, כלי ניווט, תמיכה, קהילה.
- Screenshot of courier app.
- CTA: `הצטרפות כשליח →`.

### 5.6 Coverage

- Stylized Ashdod neighborhood map. Can be a simplified SVG (not an interactive Leaflet map — we want editorial illustration, not live data). Or a static rendered Leaflet screenshot.
- Lists covered neighborhoods alongside.
- Tagline: `פועלים היום בכל שכונות אשדוד.`

### 5.7 SocialProof

- Top: stats strip, three large numerals in serif, label underneath each.
- Bottom: 3 testimonial cards in a row, pull-quote style with name + role underneath. Testimonials are **placeholder text** — spec flags this.

### 5.8 FAQ (`#faq`)

- Accordion, 8 items spanning: pricing, onboarding time, courier eligibility, coverage, support hours, payments, refunds, data/privacy.
- Custom accordion using `<details><summary>` (no new library). Phosphor `CaretDown` rotates on open.
- Ink border bottom between items.

### 5.9 FinalCTA

- Centered section on canvas, ~40vh.
- Serif headline: `מוכנים להזיז?`
- Two equal buttons side-by-side (stack on mobile): `אני עסק` (primary gradient) / `אני שליח` (outlined ink).

### 5.10 LandingFooter

- 3-column on desktop: brand + tagline / links (מוצר, חברה, תמיכה) / contact + social.
- Copyright row at bottom with legal links.

## 6. Auth pages — restyle

Structure and auth logic untouched. Changes are purely visual to match Editorial Light:

- **Background:** `bg-canvas` replaces the white + gradient panel today.
- **Hero panel on Login/Register:** keep the 45/55 split. Replace dark gradient hero with an off-canvas panel that has a serif headline, small proof strip, and a single illustration or subtle abstract mark. No animated gradients.
- **Form card:** white card with `2–4px` rounded corners, thin `#e8e6dc` border, minimal shadow.
- **Inputs:** keep existing `<Input />` component API but restyle via tailwind classes — `border` uses `#111` at focus, no heavy box-shadow.
- **Primary button:** retain the gradient CTA for continuity with the landing page.
- **Role selector on Login:** keep the two-card chooser; restyle cards to match editorial tone (thin border, serif role label, small Phosphor icon).
- **ForgotPassword / ResetPassword:** single-column centered card on canvas. Same structural elements, restyled.

## 7. Data flow

- Landing is static. Only state is the hero `activeTab` (`'business' | 'courier'`) via `useState`.
- FAQ uses native `<details>` — no state needed.
- All Hebrew copy, stats, testimonials, FAQ entries live in `components/landing/content.ts` as typed constants so copy edits are isolated from JSX.

## 8. Error handling

- Landing has no network calls — no error surface.
- Auth pages continue to use existing toast-based error pattern.

## 9. Placeholders that need user confirmation before production

The spec declares these as explicitly-marked placeholders in `content.ts` (prefixed `PLACEHOLDER_`):

- Stats strip numbers (businesses served, deliveries completed, avg rating).
- Testimonial quotes, names, roles.
- Business dashboard screenshot + courier app screenshot.
- FAQ answers — drafted from best knowledge of the platform, marked `// TODO: verify` on each item.
- Neighborhood list in Coverage.

These will render as-is (so the page looks complete) but are flagged for the user to replace before real launch.

## 10. Accessibility

- Semantic structure: one `<h1>` in the hero, `<h2>` per section, `<nav>`, `<main>`, `<section>`, `<footer>`.
- All interactive elements reachable by keyboard with visible focus (`outline: 2px solid #533afd` or equivalent).
- Tab order respects RTL reading order.
- Color contrast AA on canvas: ink on canvas = 16.1:1; ink-muted on canvas = 7.1:1 — both pass.
- Images have `alt` attributes; decorative SVGs have `aria-hidden`.
- Details/summary accordions are keyboard-accessible natively.

## 11. Responsive

- Breakpoints: 375px (mobile), 768px (tablet), 1024px (desktop), 1280px+ (wide).
- Hero: 80vh desktop → auto mobile; CTAs stack vertical on mobile.
- HowItWorks: 3-col → single column with vertical connector line.
- BusinessSection / CourierSection: 2×2 tile grid → single column; screenshot below tiles on mobile.
- Coverage: map above list on mobile.
- SocialProof testimonials: 3-col → horizontal scroll on mobile.

## 12. Testing

- Manual visual QA at 375 / 768 / 1280.
- Smoke test each auth flow end-to-end (login as business, login as courier, register business, register courier, forgot password, reset password).
- Verify routing: unauthed user sees Landing; authed user redirects to role dashboard; `/login` still reachable directly.
- Lighthouse targets: Performance ≥85, Accessibility ≥95, Best Practices ≥90.

## 13. Out of scope

- No backend or API changes.
- No i18n / English version.
- No CMS for content editing.
- No analytics events (can be added later in a dedicated task).
- No animations beyond simple fade/slide on scroll reveal (CSS-only, no library).
- No SEO beyond basic `<title>`, `<meta name="description">`, `<meta property="og:*">` — full SEO is a separate task.
- Business/courier portals themselves remain unchanged.
- Admin portal remains unchanged.

## 14. Key trade-offs and why

- **Dedicated `/login` route vs drawer over `/`:** Kept the route. Drawer would force deep-linking workarounds (`/?auth=login`), complicate existing email-reset-link flows, and make the auth experience less dignified. The landing-page `כניסה` link going to `/login` is industry-standard and adds no friction.
- **Editorial Light vs Aurora Glass:** Glass evolves the current brand; Editorial differentiates the landing from the authenticated product, which is exactly what a first-impression page should do. The authed app can keep its current glass direction.
- **Toggle hero vs split hero:** Split is clearer for first-time visitors but visually noisier; toggle keeps brand focus while still serving both audiences. User chose toggle.
- **Static map vs interactive map:** Static (SVG or image) is lighter, faster, and matches the editorial tone. Interactive map on a landing page is a gimmick for this use case.
