# Homepage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the login-first `/` with a multi-section Editorial Light marketing landing page, and restyle the four auth pages (`/login`, `/register`, `/forgot-password`, `/reset-password`) to match.

**Architecture:** All work happens inside `admin-panel/src/`. The landing page is a composition of ~10 stateless, content-driven components reading from a single `components/landing/content.ts` constants file. Only logic state is the hero's `activeTab` via `useState`. The auth pages retain their existing structure and auth logic, with only their JSX/styling rewritten.

**Tech Stack:** React 18, react-router-dom 6, TypeScript, Tailwind CSS 3, `@phosphor-icons/react`, Vite. No new dependencies are introduced. No test framework is currently installed; verification is via `tsc --noEmit`, `vite build`, and manual visual checks in the dev server.

**Reference:** The design spec is `docs/superpowers/specs/2026-04-17-homepage-redesign-design.md`. Read it before starting.

---

## File structure

**New files:**
```
admin-panel/src/pages/Landing.tsx
admin-panel/src/components/landing/content.ts
admin-panel/src/components/landing/LandingNav.tsx
admin-panel/src/components/landing/Hero.tsx
admin-panel/src/components/landing/HowItWorks.tsx
admin-panel/src/components/landing/BusinessSection.tsx
admin-panel/src/components/landing/CourierSection.tsx
admin-panel/src/components/landing/Coverage.tsx
admin-panel/src/components/landing/SocialProof.tsx
admin-panel/src/components/landing/FAQ.tsx
admin-panel/src/components/landing/FinalCTA.tsx
admin-panel/src/components/landing/LandingFooter.tsx
```

**Modified files:**
```
admin-panel/tailwind.config.js            # add canvas/ink/border-editorial + font-serif
admin-panel/src/App.tsx                   # route `/` to <Landing/> for unauthed users
admin-panel/src/pages/Login.tsx           # restyle only — Editorial Light
admin-panel/src/pages/Register.tsx        # restyle only
admin-panel/src/pages/ForgotPassword.tsx  # restyle only
admin-panel/src/pages/ResetPassword.tsx   # restyle only
```

**No file deletions. No deps added.**

---

## Verification tooling

- **TypeScript check:** `cd admin-panel && npx tsc --noEmit`
- **Build:** `cd admin-panel && npm run build`
- **Dev server:** `cd admin-panel && npm run dev` then open the printed URL.
- **Manual visual check** after each task that renders something: open the dev server and confirm the expected result. Check at viewports 375px (mobile), 768px (tablet), 1280px+ (desktop) using DevTools device toolbar.

Wherever a task says "Verify in browser," do this:
1. `npm run dev` is already running.
2. Hard-refresh the target URL (Ctrl+Shift+R).
3. Confirm the expected rendering.

If `npm run dev` is not already running at the start of a task that needs it, start it in the background.

---

## Task 1: Extend Tailwind config with Editorial Light tokens

**Files:**
- Modify: `admin-panel/tailwind.config.js`

- [ ] **Step 1: Read current config**

Read `admin-panel/tailwind.config.js`. Note the existing `colors`, `fontFamily`, `boxShadow`, `borderRadius` objects under `theme.extend`.

- [ ] **Step 2: Add Editorial Light tokens**

Edit `admin-panel/tailwind.config.js`. Inside `theme.extend.colors`, add these keys (leave all existing keys untouched):

```js
// ─── Editorial Light tokens ──────────────────────────────────────
canvas:           '#fbfaf6',  // off-white page background
ink:              '#111111',  // primary text on canvas
inkMuted:         '#555555',  // secondary text on canvas
borderEditorial:  '#e8e6dc',  // subtle hairlines on canvas
```

Inside `theme.extend.fontFamily`, add:

```js
serif: ['Georgia', '"Times New Roman"', 'serif'],
```

Inside `theme.extend.boxShadow`, add:

```js
'editorial-card': '0 1px 2px rgba(17,17,17,0.04), 0 8px 24px rgba(17,17,17,0.06)',
```

- [ ] **Step 3: Verify build compiles**

Run:
```bash
cd admin-panel && npx tsc --noEmit
```
Expected: exit code 0, no errors.

- [ ] **Step 4: Commit**

```bash
git add admin-panel/tailwind.config.js
git commit -m "feat(landing): add Editorial Light design tokens to Tailwind"
```

---

## Task 2: Create landing content constants file

**Files:**
- Create: `admin-panel/src/components/landing/content.ts`

- [ ] **Step 1: Create the directory and file**

Create `admin-panel/src/components/landing/content.ts` with this exact content:

```ts
// Central source of truth for Hebrew copy on the landing page.
// Edit copy here, not in JSX files.
//
// PLACEHOLDER_* constants are mock values that need to be replaced with
// verified data before production launch.

import type { ReactNode } from 'react';

export type Audience = 'business' | 'courier';

// ─── Hero content ─────────────────────────────────────────────────
export const heroContent: Record<Audience, {
  headlineLead: string;
  headlineAccent: string;
  headlineTail: string;
  sub: string;
  primaryCta: string;
  secondaryCta: string;
  registerHref: string;
}> = {
  business: {
    headlineLead: 'המשלוח ',
    headlineAccent: 'המקומי',
    headlineTail: ' שלך. מהיר. אנושי.',
    sub: 'פלטפורמת משלוחים שנבנתה באשדוד, לעסקים שצריכים שליח — עכשיו.',
    primaryCta: 'הצטרפות כעסק',
    secondaryCta: 'איך זה עובד',
    registerHref: '/register?type=business',
  },
  courier: {
    headlineLead: 'נהיגה ',
    headlineAccent: 'לקצב',
    headlineTail: ' שלך. עבודה שמכבדת את הזמן.',
    sub: 'עבודה גמישה לשליחים מקומיים — בחר משלוחים, קבע לו״ז, הרווח ישירות.',
    primaryCta: 'הצטרפות כשליח',
    secondaryCta: 'איך זה עובד',
    registerHref: '/register?type=courier',
  },
};

// PLACEHOLDER: replace with real platform numbers before launch
export const PLACEHOLDER_heroStats: { value: string; label: string }[] = [
  { value: '500+', label: 'עסקים פעילים' },
  { value: '12,000+', label: 'משלוחים' },
  { value: '4.9', label: 'דירוג ממוצע' },
];

// ─── How It Works ─────────────────────────────────────────────────
export const howItWorksSteps: { num: string; title: string; desc: string }[] = [
  { num: '01', title: 'העסק פותח משלוח', desc: 'בוחרים כתובת, פריט, ומחיר — בעשר שניות.' },
  { num: '02', title: 'שליח מקבל ואוסף', desc: 'השליח הכי קרוב מקבל התראה ויוצא לדרך.' },
  { num: '03', title: 'הלקוח מקבל בזמן', desc: 'מעקב חי מדלת לדלת, עם אישור מסירה.' },
];

// ─── For Businesses ───────────────────────────────────────────────
export const businessValueProps: { title: string; desc: string }[] = [
  { title: 'מהירות', desc: 'איסוף ממוצע תוך 12 דקות מפתיחת המשלוח.' },
  { title: 'שקיפות', desc: 'מיקום השליח על מפה, בכל שנייה, בכל משלוח.' },
  { title: 'שליטה', desc: 'דשבורד, צ׳אט, דוחות — הכל במקום אחד.' },
  { title: 'גמישות', desc: 'ללא התחייבות חודשית. משלמים לפי שימוש.' },
];

// ─── For Couriers ─────────────────────────────────────────────────
export const courierValueProps: { title: string; desc: string }[] = [
  { title: 'הכנסה גמישה', desc: 'עובדים מתי שרוצים, כמה שרוצים.' },
  { title: 'כלי ניווט', desc: 'ניווט מובנה עם Waze, Google Maps ו-Apple Maps.' },
  { title: 'תמיכה', desc: 'צוות שזמין בצ׳אט 24/7.' },
  { title: 'קהילה', desc: 'שליחים מקומיים שעוזרים אחד לשני.' },
];

// ─── Coverage (Ashdod neighborhoods) ──────────────────────────────
// TODO: verify list with operations team before launch
export const PLACEHOLDER_coverageNeighborhoods: string[] = [
  'רובע א׳',
  'רובע ב׳',
  'רובע ג׳',
  'רובע ד׳',
  'רובע ה׳',
  'רובע ו׳',
  'רובע ז׳',
  'רובע ח׳',
  'רובע ט׳',
  'רובע י׳',
  'רובע י״א',
  'רובע י״ב',
  'רובע י״ג',
  'רובע ט״ו',
  'רובע ט״ז',
  'רובע י״ז',
  'העיר העתיקה',
  'נווה ים',
];

// ─── Testimonials ─────────────────────────────────────────────────
// PLACEHOLDER: replace with real quotes before launch
export const PLACEHOLDER_testimonials: {
  quote: string; name: string; role: string;
}[] = [
  { quote: 'מאז שעברנו ל-ZOOZ, המשלוחים יוצאים בחצי מהזמן. הלקוחות רואים את ההבדל.', name: 'יוסי לוי', role: 'בעלים, פיצה יוסי' },
  { quote: 'אני עובד כששעות מתאימות לי ורואה כל שקל שאני מרוויח. הכי פשוט שעבדתי איתו.', name: 'דניאל כהן', role: 'שליח' },
  { quote: 'הדשבורד שקט, המשלוחים מגיעים, הלקוחות מרוצים. זה מה שחיפשנו.', name: 'שרה מזרחי', role: 'מנהלת תפעול, סופר מרכזי' },
];

// ─── FAQ ──────────────────────────────────────────────────────────
// TODO: verify answers with product team
export const faqItems: { q: string; a: string }[] = [
  { q: 'כמה זה עולה לעסק?', a: 'תשלום פר משלוח בלבד — ללא דמי שימוש חודשיים וללא התחייבות. המחיר מחושב לפי מרחק ונפח.' },
  { q: 'כמה זמן לוקח להצטרף כעסק?', a: 'טופס הרשמה של 3 דקות, אישור תוך יום עסקים, ואפשר להתחיל לשלוח מיד אחרי.' },
  { q: 'איזה אזורים מכוסים?', a: 'כל שכונות אשדוד. מחוץ לעיר — צרו קשר ונבדוק.' },
  { q: 'איך אני נרשם כשליח?', a: 'ממלאים טופס, מצרפים רישיון ופרטי רכב, ומחכים לאישור של 1–2 ימי עסקים.' },
  { q: 'איזה רכבים מתקבלים?', a: 'קטנוע, אופנוע, אופניים חשמליים, ורכב פרטי — לפי סוג המשלוח.' },
  { q: 'מתי מקבלים תשלום?', a: 'שליחים מקבלים תשלום שבועי, ישירות לחשבון הבנק.' },
  { q: 'מה אם משלוח לא מגיע?', a: 'לכל משלוח יש מעקב חי וביטוח. במקרה חריג, צוות התמיכה פותר תוך דקות.' },
  { q: 'האם הפרטים שלי מאובטחים?', a: 'כל הנתונים מוצפנים, נשמרים בשרתים בישראל, ולא נמסרים לצד שלישי.' },
];

// ─── Final CTA ────────────────────────────────────────────────────
export const finalCta = {
  headline: 'מוכנים להזיז?',
  sub: 'הצטרפות בלי עלות, בלי התחייבות, בלי טופס ארוך.',
  businessLabel: 'אני עסק',
  courierLabel: 'אני שליח',
};

// ─── Footer ───────────────────────────────────────────────────────
export const footerContent = {
  brand: 'ZOOZ',
  tagline: 'פלטפורמת המשלוחים של אשדוד',
  columns: [
    {
      heading: 'מוצר',
      links: [
        { label: 'לעסקים', href: '#for-businesses' },
        { label: 'לשליחים', href: '#for-couriers' },
        { label: 'איך זה עובד', href: '#how-it-works' },
        { label: 'שאלות נפוצות', href: '#faq' },
      ],
    },
    {
      heading: 'חברה',
      links: [
        { label: 'אודות', href: '#' },
        { label: 'צור קשר', href: '#' },
        { label: 'תנאי שימוש', href: '#' },
        { label: 'מדיניות פרטיות', href: '#' },
      ],
    },
    {
      heading: 'כניסה',
      links: [
        { label: 'כניסה למערכת', href: '/login' },
        { label: 'הרשמה כעסק', href: '/register?type=business' },
        { label: 'הרשמה כשליח', href: '/register?type=courier' },
      ],
    },
  ],
  copyright: `© ${new Date().getFullYear()} ZOOZ · כל הזכויות שמורות`,
};

// ─── Anchor IDs (single source of truth for nav + sections) ──────
export const anchors = {
  howItWorks: 'how-it-works',
  forBusinesses: 'for-businesses',
  forCouriers: 'for-couriers',
  faq: 'faq',
} as const;
```

- [ ] **Step 2: Verify compile**

Run:
```bash
cd admin-panel && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add admin-panel/src/components/landing/content.ts
git commit -m "feat(landing): add central content constants for landing page"
```

---

## Task 3: LandingNav component

**Files:**
- Create: `admin-panel/src/components/landing/LandingNav.tsx`

- [ ] **Step 1: Create the component**

Create `admin-panel/src/components/landing/LandingNav.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { List, X } from '@phosphor-icons/react';
import { anchors } from './content';

const navLinks: { label: string; href: string }[] = [
  { label: 'איך זה עובד', href: `#${anchors.howItWorks}` },
  { label: 'לעסקים', href: `#${anchors.forBusinesses}` },
  { label: 'לשליחים', href: `#${anchors.forCouriers}` },
  { label: 'שאלות נפוצות', href: `#${anchors.faq}` },
];

const LandingNav: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-colors duration-200 ${
        scrolled ? 'bg-canvas/90 backdrop-blur border-b border-borderEditorial' : 'bg-transparent'
      }`}
    >
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-5 md:px-8 h-16" dir="rtl">
        {/* Brand */}
        <Link to="/" className="font-serif text-xl font-semibold text-ink tracking-tight">
          ZOOZ
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8 text-[14px] text-ink">
          {navLinks.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="hover:text-primary transition-colors">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-[14px] text-ink hover:text-primary transition-colors">
            כניסה
          </Link>
          <Link
            to="/register?type=business"
            className="text-[14px] font-semibold text-white px-4 py-2 rounded"
            style={{ background: 'linear-gradient(135deg, #533afd, #3d22e0)' }}
          >
            הצטרפות
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 text-ink"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="תפריט"
        >
          {mobileOpen ? <X size={22} /> : <List size={22} />}
        </button>
      </nav>

      {/* Mobile sheet */}
      {mobileOpen && (
        <div className="md:hidden bg-canvas border-t border-borderEditorial" dir="rtl">
          <ul className="px-5 py-4 space-y-3 text-[15px] text-ink">
            {navLinks.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="block py-1" onClick={() => setMobileOpen(false)}>
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <Link to="/login" className="block py-1" onClick={() => setMobileOpen(false)}>
                כניסה
              </Link>
            </li>
            <li>
              <Link
                to="/register?type=business"
                className="block text-center font-semibold text-white py-2 rounded mt-2"
                style={{ background: 'linear-gradient(135deg, #533afd, #3d22e0)' }}
                onClick={() => setMobileOpen(false)}
              >
                הצטרפות
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
};

export default LandingNav;
```

- [ ] **Step 2: Verify compile**

```bash
cd admin-panel && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add admin-panel/src/components/landing/LandingNav.tsx
git commit -m "feat(landing): add sticky nav with mobile sheet"
```

---

## Task 4: Hero component (toggle)

**Files:**
- Create: `admin-panel/src/components/landing/Hero.tsx`

- [ ] **Step 1: Create the component**

Create `admin-panel/src/components/landing/Hero.tsx`:

```tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { heroContent, PLACEHOLDER_heroStats, anchors, type Audience } from './content';

const Hero: React.FC = () => {
  const [tab, setTab] = useState<Audience>('business');
  const c = heroContent[tab];

  return (
    <section
      dir="rtl"
      className="relative border-b border-ink"
      style={{ minHeight: '78vh' }}
    >
      <div className="max-w-4xl mx-auto px-5 md:px-8 pt-14 md:pt-24 pb-16 md:pb-20 text-center">
        {/* Toggle */}
        <div className="inline-flex mb-10 text-[14px] font-medium" role="tablist">
          {(['business', 'courier'] as Audience[]).map((t) => {
            const label = t === 'business' ? 'לעסקים' : 'לשליחים';
            const active = tab === t;
            return (
              <button
                key={t}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t)}
                className={`px-4 pb-1 border-b-2 transition-colors ${
                  active ? 'border-ink text-ink' : 'border-transparent text-inkMuted hover:text-ink'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Headline */}
        <h1 className="font-serif text-ink leading-[1.1] tracking-tight mb-6"
            style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 400 }}>
          {c.headlineLead}
          <em className="not-italic font-serif italic" style={{ color: '#ea2261' }}>
            {c.headlineAccent}
          </em>
          {c.headlineTail}
        </h1>

        {/* Sub */}
        <p className="text-inkMuted mx-auto mb-10 max-w-xl"
           style={{ fontSize: 'clamp(15px, 1.6vw, 17px)' }}>
          {c.sub}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-center mb-14">
          <Link
            to={c.registerHref}
            className="inline-flex items-center justify-center px-6 py-3 rounded font-semibold text-white text-[15px]"
            style={{ background: 'linear-gradient(135deg, #533afd, #3d22e0)' }}
          >
            {c.primaryCta}
          </Link>
          <a
            href={`#${anchors.howItWorks}`}
            className="inline-flex items-center justify-center px-6 py-3 rounded font-semibold text-ink text-[15px] border border-ink"
          >
            {c.secondaryCta}
          </a>
        </div>

        {/* Proof strip */}
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[13px] text-inkMuted">
          {PLACEHOLDER_heroStats.map((s, i) => (
            <li key={i} className="flex items-baseline gap-2">
              <span className="font-serif text-ink text-[18px]">{s.value}</span>
              <span>{s.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default Hero;
```

- [ ] **Step 2: Verify compile**

```bash
cd admin-panel && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add admin-panel/src/components/landing/Hero.tsx
git commit -m "feat(landing): add toggle hero with business/courier tabs"
```

---

## Task 5: HowItWorks component

**Files:**
- Create: `admin-panel/src/components/landing/HowItWorks.tsx`

- [ ] **Step 1: Create the component**

Create `admin-panel/src/components/landing/HowItWorks.tsx`:

```tsx
import React from 'react';
import { Storefront, Motorcycle, PackageIcon } from '@phosphor-icons/react';
import { howItWorksSteps, anchors } from './content';

const stepIcons = [
  <Storefront size={28} weight="light" />,
  <Motorcycle size={28} weight="light" />,
  <PackageIcon size={28} weight="light" />,
];

const HowItWorks: React.FC = () => {
  return (
    <section
      id={anchors.howItWorks}
      dir="rtl"
      className="bg-canvas py-20 md:py-28 border-b border-borderEditorial"
    >
      <div className="max-w-5xl mx-auto px-5 md:px-8">
        <p className="text-[12px] uppercase tracking-[0.18em] text-inkMuted mb-3 text-center">
          איך זה עובד
        </p>
        <h2 className="font-serif text-ink text-center mb-16" style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 400 }}>
          שלושה צעדים. <em className="italic" style={{ color: '#ea2261' }}>בלי יותר.</em>
        </h2>

        <ol className="grid md:grid-cols-3 gap-10 md:gap-6">
          {howItWorksSteps.map((step, i) => (
            <li key={i} className="text-center md:text-right">
              <div className="flex md:block items-center gap-4">
                <div className="flex-shrink-0 w-14 h-14 rounded border border-ink flex items-center justify-center text-ink mb-0 md:mb-5">
                  {stepIcons[i]}
                </div>
                <div className="text-right">
                  <span className="font-serif text-[14px] text-inkMuted">{step.num}</span>
                </div>
              </div>
              <h3 className="font-serif text-ink text-[20px] mt-2 mb-2" style={{ fontWeight: 400 }}>
                {step.title}
              </h3>
              <p className="text-inkMuted text-[15px] leading-relaxed max-w-xs">
                {step.desc}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default HowItWorks;
```

**Note:** Phosphor exports `Package` as `PackageIcon` alias or just `Package`. If `Package` is reserved or conflicts in a given tsconfig, use `Package as PackageIcon` on import. The above uses the alias to be safe.

Adjust the import line if needed after the tsc check:
```tsx
import { Storefront, Motorcycle, Package as PackageIcon } from '@phosphor-icons/react';
```

- [ ] **Step 2: Verify compile**

```bash
cd admin-panel && npx tsc --noEmit
```
If an error names `Motorcycle` or `Package`, fix per Phosphor docs — valid exports include `Motorcycle` and `Package`. Use `Package as PackageIcon` alias form to avoid collision.

Expected: exit 0 after fixes.

- [ ] **Step 3: Commit**

```bash
git add admin-panel/src/components/landing/HowItWorks.tsx
git commit -m "feat(landing): add how-it-works 3-step section"
```

---

## Task 6: BusinessSection component

**Files:**
- Create: `admin-panel/src/components/landing/BusinessSection.tsx`

- [ ] **Step 1: Create the component**

Create `admin-panel/src/components/landing/BusinessSection.tsx`:

```tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from '@phosphor-icons/react';
import { businessValueProps, anchors } from './content';

const BusinessSection: React.FC = () => {
  return (
    <section
      id={anchors.forBusinesses}
      dir="rtl"
      className="bg-canvas py-20 md:py-28 border-b border-borderEditorial"
    >
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <p className="text-[12px] uppercase tracking-[0.18em] text-inkMuted mb-3">
          לעסקים · for businesses
        </p>
        <h2 className="font-serif text-ink mb-4" style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 400 }}>
          כל הכלים <em className="italic" style={{ color: '#ea2261' }}>לנהל</em> את המשלוחים שלך.
        </h2>
        <p className="text-inkMuted text-[16px] max-w-2xl mb-14">
          מסעדה, מכולת, בית מרקחת או חנות. אם אתם שולחים — ZOOZ הופך את זה לפשוט.
        </p>

        <div className="grid md:grid-cols-[1.1fr_1fr] gap-10 md:gap-14 items-start">
          {/* Tiles */}
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {businessValueProps.map((v, i) => (
              <li
                key={i}
                className="border border-borderEditorial bg-white rounded-lg p-5 shadow-editorial-card"
              >
                <h3 className="font-serif text-ink text-[18px] mb-2" style={{ fontWeight: 400 }}>
                  {v.title}
                </h3>
                <p className="text-inkMuted text-[14px] leading-relaxed">{v.desc}</p>
              </li>
            ))}
          </ul>

          {/* Screenshot placeholder */}
          <div
            className="rounded-lg border border-borderEditorial bg-white aspect-[4/3] flex items-center justify-center text-inkMuted text-[13px]"
            aria-label="צילום מסך של דשבורד העסקים"
          >
            {/* TODO: replace with real screenshot — admin-panel/public/landing/business-dashboard.png */}
            מסך דשבורד לעסקים
          </div>
        </div>

        <div className="mt-10">
          <Link
            to="/register?type=business"
            className="inline-flex items-center gap-2 text-[14px] font-semibold text-ink border-b border-ink pb-1 hover:text-primary hover:border-primary transition-colors"
          >
            הצטרפות כעסק
            <ArrowLeft size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BusinessSection;
```

- [ ] **Step 2: Verify compile**

```bash
cd admin-panel && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add admin-panel/src/components/landing/BusinessSection.tsx
git commit -m "feat(landing): add for-businesses value prop section"
```

---

## Task 7: CourierSection component

**Files:**
- Create: `admin-panel/src/components/landing/CourierSection.tsx`

- [ ] **Step 1: Create the component**

Create `admin-panel/src/components/landing/CourierSection.tsx`:

```tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from '@phosphor-icons/react';
import { courierValueProps, anchors } from './content';

const CourierSection: React.FC = () => {
  return (
    <section
      id={anchors.forCouriers}
      dir="rtl"
      className="bg-canvas py-20 md:py-28 border-b border-borderEditorial"
    >
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <p className="text-[12px] uppercase tracking-[0.18em] text-inkMuted mb-3">
          לשליחים · for couriers
        </p>
        <h2 className="font-serif text-ink mb-4" style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 400 }}>
          עבודה <em className="italic" style={{ color: '#ea2261' }}>שמכבדת</em> את הזמן שלך.
        </h2>
        <p className="text-inkMuted text-[16px] max-w-2xl mb-14">
          בחר משלוחים לפי המרחק, הרכב, והשעות שלך. בלי לחץ, בלי מנהל מעל הכתף.
        </p>

        <div className="grid md:grid-cols-[1fr_1.1fr] gap-10 md:gap-14 items-start">
          {/* Screenshot placeholder */}
          <div
            className="rounded-lg border border-borderEditorial bg-white aspect-[4/3] flex items-center justify-center text-inkMuted text-[13px] order-last md:order-first"
            aria-label="צילום מסך של אפליקציית השליחים"
          >
            {/* TODO: replace with real screenshot — admin-panel/public/landing/courier-app.png */}
            מסך אפליקציית שליחים
          </div>

          {/* Tiles */}
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {courierValueProps.map((v, i) => (
              <li
                key={i}
                className="border border-borderEditorial bg-white rounded-lg p-5 shadow-editorial-card"
              >
                <h3 className="font-serif text-ink text-[18px] mb-2" style={{ fontWeight: 400 }}>
                  {v.title}
                </h3>
                <p className="text-inkMuted text-[14px] leading-relaxed">{v.desc}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10">
          <Link
            to="/register?type=courier"
            className="inline-flex items-center gap-2 text-[14px] font-semibold text-ink border-b border-ink pb-1 hover:text-primary hover:border-primary transition-colors"
          >
            הצטרפות כשליח
            <ArrowLeft size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CourierSection;
```

- [ ] **Step 2: Verify compile**

```bash
cd admin-panel && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add admin-panel/src/components/landing/CourierSection.tsx
git commit -m "feat(landing): add for-couriers value prop section"
```

---

## Task 8: Coverage component

**Files:**
- Create: `admin-panel/src/components/landing/Coverage.tsx`

- [ ] **Step 1: Create the component**

Create `admin-panel/src/components/landing/Coverage.tsx`:

```tsx
import React from 'react';
import { MapPin } from '@phosphor-icons/react';
import { PLACEHOLDER_coverageNeighborhoods } from './content';

const Coverage: React.FC = () => {
  return (
    <section
      dir="rtl"
      className="bg-canvas py-20 md:py-28 border-b border-borderEditorial"
    >
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <p className="text-[12px] uppercase tracking-[0.18em] text-inkMuted mb-3">
          אזור שירות · coverage
        </p>
        <h2 className="font-serif text-ink mb-4" style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 400 }}>
          פועלים היום בכל שכונות <em className="italic" style={{ color: '#ea2261' }}>אשדוד</em>.
        </h2>
        <p className="text-inkMuted text-[16px] max-w-2xl mb-14">
          לא גוררים משלוחים מתל אביב. לא מפסידים זמן בדרך. רק אשדוד — רק מקומי.
        </p>

        <div className="grid md:grid-cols-[1.2fr_1fr] gap-10 md:gap-14 items-start">
          {/* Stylized map */}
          <div
            className="rounded-lg border border-ink bg-white aspect-[4/3] relative overflow-hidden"
            aria-label="מפה של אשדוד"
          >
            {/* Simplified map illustration — can be replaced with SVG later */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg viewBox="0 0 400 300" className="w-full h-full" aria-hidden="true">
                <rect width="400" height="300" fill="#fbfaf6" />
                {/* Coastline */}
                <path d="M20,60 Q60,80 90,120 Q100,160 130,200 Q180,240 260,250 Q340,240 380,200 L380,290 L20,290 Z" fill="#f3f0e5" stroke="#e8e6dc" strokeWidth="1" />
                {/* Street grid */}
                {Array.from({ length: 6 }).map((_, i) => (
                  <line key={`h${i}`} x1="60" y1={90 + i * 30} x2="370" y2={90 + i * 30} stroke="#e8e6dc" strokeWidth="0.5" />
                ))}
                {Array.from({ length: 8 }).map((_, i) => (
                  <line key={`v${i}`} x1={80 + i * 38} y1="80" x2={80 + i * 38} y2="280" stroke="#e8e6dc" strokeWidth="0.5" />
                ))}
                {/* Pin cluster */}
                {[
                  [140, 140], [200, 160], [260, 150], [180, 200], [240, 210],
                  [160, 180], [220, 180], [280, 200], [300, 170], [120, 200],
                ].map(([cx, cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r="4" fill="#533afd" opacity="0.75" />
                ))}
                {/* ZOOZ label */}
                <text x="200" y="60" textAnchor="middle" fontFamily="Georgia, serif" fontSize="14" fill="#111">אשדוד</text>
              </svg>
            </div>
          </div>

          {/* Neighborhoods list */}
          <div>
            <h3 className="font-serif text-ink text-[18px] mb-4 flex items-center gap-2" style={{ fontWeight: 400 }}>
              <MapPin size={18} weight="light" />
              שכונות מכוסות
            </h3>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-[14px] text-inkMuted">
              {PLACEHOLDER_coverageNeighborhoods.map((n) => (
                <li key={n} className="border-b border-borderEditorial pb-1">{n}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Coverage;
```

- [ ] **Step 2: Verify compile**

```bash
cd admin-panel && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add admin-panel/src/components/landing/Coverage.tsx
git commit -m "feat(landing): add coverage map section"
```

---

## Task 9: SocialProof component

**Files:**
- Create: `admin-panel/src/components/landing/SocialProof.tsx`

- [ ] **Step 1: Create the component**

Create `admin-panel/src/components/landing/SocialProof.tsx`:

```tsx
import React from 'react';
import { Quotes } from '@phosphor-icons/react';
import { PLACEHOLDER_heroStats, PLACEHOLDER_testimonials } from './content';

const SocialProof: React.FC = () => {
  return (
    <section dir="rtl" className="bg-canvas py-20 md:py-28 border-b border-borderEditorial">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4 mb-16 md:mb-20 border-y border-ink py-10">
          {PLACEHOLDER_heroStats.map((s, i) => (
            <div key={i} className="text-center">
              <div className="font-serif text-ink" style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 400 }}>
                {s.value}
              </div>
              <div className="text-inkMuted text-[13px] md:text-[14px] mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <h2 className="sr-only">מה אומרים עלינו</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {PLACEHOLDER_testimonials.map((t, i) => (
            <figure
              key={i}
              className="border border-borderEditorial bg-white rounded-lg p-6 shadow-editorial-card flex flex-col"
            >
              <Quotes size={22} weight="fill" className="text-[color:#ea2261] mb-4" />
              <blockquote className="font-serif text-ink text-[17px] leading-relaxed flex-1" style={{ fontWeight: 400 }}>
                {t.quote}
              </blockquote>
              <figcaption className="mt-5 text-[13px]">
                <div className="text-ink font-semibold">{t.name}</div>
                <div className="text-inkMuted">{t.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
```

- [ ] **Step 2: Verify compile**

```bash
cd admin-panel && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add admin-panel/src/components/landing/SocialProof.tsx
git commit -m "feat(landing): add stats + testimonials social proof"
```

---

## Task 10: FAQ component

**Files:**
- Create: `admin-panel/src/components/landing/FAQ.tsx`

- [ ] **Step 1: Create the component**

Create `admin-panel/src/components/landing/FAQ.tsx`:

```tsx
import React from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { faqItems, anchors } from './content';

const FAQ: React.FC = () => {
  return (
    <section
      id={anchors.faq}
      dir="rtl"
      className="bg-canvas py-20 md:py-28 border-b border-borderEditorial"
    >
      <div className="max-w-3xl mx-auto px-5 md:px-8">
        <p className="text-[12px] uppercase tracking-[0.18em] text-inkMuted mb-3">
          שאלות נפוצות · FAQ
        </p>
        <h2 className="font-serif text-ink mb-12" style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 400 }}>
          שאלות <em className="italic" style={{ color: '#ea2261' }}>שכדאי</em> לשאול.
        </h2>

        <ul className="border-t border-ink">
          {faqItems.map((item, i) => (
            <li key={i} className="border-b border-ink">
              <details className="group">
                <summary className="list-none flex items-center justify-between cursor-pointer py-5 text-ink text-[16px] font-semibold">
                  <span>{item.q}</span>
                  <CaretDown
                    size={18}
                    weight="light"
                    className="transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="pb-6 text-inkMuted text-[15px] leading-relaxed">
                  {item.a}
                </p>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default FAQ;
```

- [ ] **Step 2: Verify compile**

```bash
cd admin-panel && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add admin-panel/src/components/landing/FAQ.tsx
git commit -m "feat(landing): add FAQ accordion section"
```

---

## Task 11: FinalCTA component

**Files:**
- Create: `admin-panel/src/components/landing/FinalCTA.tsx`

- [ ] **Step 1: Create the component**

Create `admin-panel/src/components/landing/FinalCTA.tsx`:

```tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { finalCta } from './content';

const FinalCTA: React.FC = () => {
  return (
    <section dir="rtl" className="bg-canvas py-24 md:py-32">
      <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
        <h2 className="font-serif text-ink mb-4" style={{ fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 400 }}>
          {finalCta.headline}
        </h2>
        <p className="text-inkMuted text-[16px] md:text-[17px] mb-10">{finalCta.sub}</p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/register?type=business"
            className="inline-flex items-center justify-center px-8 py-3 rounded text-white font-semibold text-[15px]"
            style={{ background: 'linear-gradient(135deg, #533afd, #3d22e0)' }}
          >
            {finalCta.businessLabel}
          </Link>
          <Link
            to="/register?type=courier"
            className="inline-flex items-center justify-center px-8 py-3 rounded text-ink font-semibold text-[15px] border border-ink"
          >
            {finalCta.courierLabel}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
```

- [ ] **Step 2: Verify compile**

```bash
cd admin-panel && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add admin-panel/src/components/landing/FinalCTA.tsx
git commit -m "feat(landing): add final dual-path CTA section"
```

---

## Task 12: LandingFooter component

**Files:**
- Create: `admin-panel/src/components/landing/LandingFooter.tsx`

- [ ] **Step 1: Create the component**

Create `admin-panel/src/components/landing/LandingFooter.tsx`:

```tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { footerContent } from './content';

const LandingFooter: React.FC = () => {
  return (
    <footer dir="rtl" className="bg-ink text-canvas">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-14">
        <div className="grid md:grid-cols-[1.2fr_1fr_1fr_1fr] gap-10 md:gap-8">
          {/* Brand */}
          <div>
            <div className="font-serif text-2xl mb-2" style={{ fontWeight: 400 }}>{footerContent.brand}</div>
            <p className="text-canvas/70 text-[13px] leading-relaxed max-w-xs">
              {footerContent.tagline}
            </p>
          </div>

          {/* Link columns */}
          {footerContent.columns.map((col) => (
            <div key={col.heading}>
              <h4 className="text-[13px] uppercase tracking-[0.18em] text-canvas/60 mb-4">
                {col.heading}
              </h4>
              <ul className="space-y-2">
                {col.links.map((l) => {
                  const isAnchor = l.href.startsWith('#');
                  const isInternal = l.href.startsWith('/');
                  return (
                    <li key={l.label}>
                      {isInternal ? (
                        <Link to={l.href} className="text-canvas/85 hover:text-canvas text-[14px] transition-colors">
                          {l.label}
                        </Link>
                      ) : (
                        <a
                          href={l.href}
                          className="text-canvas/85 hover:text-canvas text-[14px] transition-colors"
                        >
                          {l.label}
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-canvas/15 text-canvas/60 text-[12px] text-center">
          {footerContent.copyright}
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
```

- [ ] **Step 2: Verify compile**

```bash
cd admin-panel && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add admin-panel/src/components/landing/LandingFooter.tsx
git commit -m "feat(landing): add site footer with link columns"
```

---

## Task 13: Landing page composition

**Files:**
- Create: `admin-panel/src/pages/Landing.tsx`

- [ ] **Step 1: Create the page**

Create `admin-panel/src/pages/Landing.tsx`:

```tsx
import React, { useEffect } from 'react';
import LandingNav from '../components/landing/LandingNav';
import Hero from '../components/landing/Hero';
import HowItWorks from '../components/landing/HowItWorks';
import BusinessSection from '../components/landing/BusinessSection';
import CourierSection from '../components/landing/CourierSection';
import Coverage from '../components/landing/Coverage';
import SocialProof from '../components/landing/SocialProof';
import FAQ from '../components/landing/FAQ';
import FinalCTA from '../components/landing/FinalCTA';
import LandingFooter from '../components/landing/LandingFooter';

const Landing: React.FC = () => {
  // Set document metadata for this page
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'ZOOZ · פלטפורמת המשלוחים של אשדוד';

    const meta = document.querySelector('meta[name="description"]');
    const prevDesc = meta?.getAttribute('content') ?? null;
    const newDesc = 'פלטפורמת משלוחים שנבנתה באשדוד, לעסקים ולשליחים מקומיים. מעקב חי, צ׳אט מובנה, תמיכה 24/7.';
    if (meta) {
      meta.setAttribute('content', newDesc);
    } else {
      const m = document.createElement('meta');
      m.setAttribute('name', 'description');
      m.setAttribute('content', newDesc);
      document.head.appendChild(m);
    }

    return () => {
      document.title = prevTitle;
      if (prevDesc !== null && meta) meta.setAttribute('content', prevDesc);
    };
  }, []);

  return (
    <div className="bg-canvas text-ink min-h-screen font-sans">
      <LandingNav />
      <main>
        <Hero />
        <HowItWorks />
        <BusinessSection />
        <CourierSection />
        <Coverage />
        <SocialProof />
        <FAQ />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
};

export default Landing;
```

- [ ] **Step 2: Verify compile**

```bash
cd admin-panel && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add admin-panel/src/pages/Landing.tsx
git commit -m "feat(landing): compose landing page from section components"
```

---

## Task 14: Wire the route in App.tsx

**Files:**
- Modify: `admin-panel/src/App.tsx`

- [ ] **Step 1: Add import**

In `admin-panel/src/App.tsx`, in the block of page imports near the top (right after the `import Login from './pages/Login';` line, which is currently line 24), add:

```tsx
import Landing from './pages/Landing';
```

- [ ] **Step 2: Replace the `/` route**

In the same file, locate the current `/` route (around lines 148–155):

```tsx
            <Route
              path="/"
              element={
                localStorage.getItem('admin_token')
                  ? <Navigate to={getRoleHome()} replace />
                  : <Navigate to="/login" replace />
              }
            />
```

Replace with:

```tsx
            <Route
              path="/"
              element={
                localStorage.getItem('admin_token')
                  ? <Navigate to={getRoleHome()} replace />
                  : <Landing />
              }
            />
```

- [ ] **Step 3: Verify compile**

```bash
cd admin-panel && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 4: Verify in browser**

Start or restart dev server:
```bash
cd admin-panel && npm run dev
```
Open the printed URL (typically `http://localhost:5173/`).

Expected when logged out (clear localStorage if needed — DevTools → Application → Storage → Clear site data):
- `/` renders the landing page with all 8 sections top to bottom: Nav, Hero, HowItWorks, BusinessSection, CourierSection, Coverage, SocialProof, FAQ, FinalCTA, Footer.
- Hero toggle switches copy between business and courier versions.
- Nav anchor links scroll to corresponding sections.
- `כניסה` button in nav navigates to `/login`.
- `הצטרפות` button in nav navigates to `/register?type=business`.
- FAQ items expand on click.

Check at viewports 375px, 768px, 1280px — layout should adapt (nav collapses to hamburger on mobile, tile grids restack).

Expected when logged in:
- `/` still redirects to the role-appropriate dashboard (unchanged behavior).

- [ ] **Step 5: Commit**

```bash
git add admin-panel/src/App.tsx
git commit -m "feat(landing): route / to new landing page for unauthed users"
```

---

## Task 15: Restyle Login page to Editorial Light

**Files:**
- Modify: `admin-panel/src/pages/Login.tsx`

This task replaces the visual JSX and inline styles. **Auth logic (`handleSubmit`, `useAuth`, syncDown, navigate, state hooks) is unchanged.** Only the rendered JSX and its class lists/inline styles change.

- [ ] **Step 1: Open the file and locate the return statement**

Read `admin-panel/src/pages/Login.tsx`. Find the `return (` at roughly line 216. Everything above it stays as-is (imports, helper components like `AppStoreBadge`, `GooglePlayBadge`, `AppDownloadBanner`, `RoleCard`, `features`, component state).

- [ ] **Step 2: Replace the returned JSX**

Replace the entire `return (...)` block (from `return (` through the closing `);` around line 436) with:

```tsx
  return (
    <div dir="rtl" className="min-h-screen flex flex-col lg:flex-row bg-canvas">
      {/* ── LEFT — Editorial hero panel (desktop only) ─────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 border-l border-borderEditorial">
        {/* Brand */}
        <Link to="/" className="font-serif text-ink text-[22px]" style={{ fontWeight: 400 }}>
          ZOOZ
        </Link>

        {/* Middle */}
        <div>
          <p className="text-[12px] uppercase tracking-[0.18em] text-inkMuted mb-4">
            כניסה · sign in
          </p>
          <h1 className="font-serif text-ink leading-[1.1] mb-6" style={{ fontSize: 'clamp(36px, 4vw, 52px)', fontWeight: 400 }}>
            חוזרים <em className="italic" style={{ color: '#ea2261' }}>הביתה</em>.
          </h1>
          <p className="text-inkMuted text-[15px] max-w-sm leading-relaxed">
            המערכת שנבנתה לאשדוד, לעסקים ולשליחים שסומכים על מקומיות, מהירות, ושקיפות.
          </p>

          <ul className="mt-10 space-y-3 text-[14px] text-inkMuted">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-1 flex-shrink-0" style={{ filter: 'grayscale(100%) brightness(0.4)' }}>{f.icon}</span>
                <div>
                  <div className="text-ink font-semibold">{f.title}</div>
                  <div className="text-[13px]">{f.desc}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom — app download */}
        <div className="rounded border border-borderEditorial p-4 bg-white">
          <div className="flex items-center gap-2 mb-3">
            <DevicePhoneMobileIcon className="w-4 h-4 text-inkMuted flex-shrink-0" />
            <p className="text-ink text-[13px] font-semibold">הורד את האפליקציה</p>
          </div>
          <div className="flex gap-2">
            <AppStoreBadge size="sm" />
            <GooglePlayBadge size="sm" />
          </div>
        </div>
      </div>

      {/* ── RIGHT — Form ───────────────────────────────────────────────── */}
      <div className="w-full lg:w-[55%] overflow-y-auto flex-1 bg-canvas">
        <div className="w-full max-w-[420px] mx-auto px-5 py-10">

          {/* Mobile brand */}
          <Link to="/" className="lg:hidden block font-serif text-ink text-[22px] mb-6" style={{ fontWeight: 400 }}>
            ZOOZ
          </Link>

          {/* App banner (mobile only) */}
          {showBanner && (
            <div className="lg:hidden">
              <AppDownloadBanner />
            </div>
          )}

          {/* Heading */}
          <div className="mb-8">
            <p className="text-[12px] uppercase tracking-[0.18em] text-inkMuted mb-2">
              כניסה
            </p>
            <h2 className="font-serif text-ink leading-tight" style={{ fontSize: '32px', fontWeight: 400 }}>
              בחר את <em className="italic" style={{ color: '#ea2261' }}>סוג</em> החשבון שלך.
            </h2>
          </div>

          {/* Role selector */}
          <div className="flex gap-3 mb-6">
            {(['business', 'courier'] as Role[]).map((r) => (
              <RoleCard key={r} role={r} selected={selectedRole === r} onSelect={() => setSelectedRole(r)} />
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="כתובת אימייל"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              dir="ltr"
              leftIcon={<EnvelopeIcon className="w-4 h-4" />}
            />
            <Input
              label="סיסמה"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              dir="ltr"
              leftIcon={<LockClosedIcon className="w-4 h-4" />}
            />

            <div className="flex justify-start pt-1">
              <Link
                to="/forgot-password"
                className="text-[13px] text-ink border-b border-ink hover:text-primary hover:border-primary transition-colors"
              >
                שכחת סיסמה?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full"
              style={{
                background: isLoading ? undefined : 'linear-gradient(135deg, #533afd, #3d22e0)',
              }}
            >
              {!isLoading && `כניסה כ${selectedRole === 'business' ? 'עסק' : 'שליח'}`}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-8">
            <div className="flex-1 h-px bg-borderEditorial" />
            <span className="text-[12px] uppercase tracking-[0.18em] text-inkMuted">או</span>
            <div className="flex-1 h-px bg-borderEditorial" />
          </div>

          {/* Register links */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/register?type=business"
              className="flex flex-col items-center gap-2 py-4 rounded border border-borderEditorial bg-white hover:border-ink transition-colors"
            >
              <BuildingStorefrontIcon className="w-5 h-5 text-ink" />
              <div className="text-center">
                <p className="text-[13px] font-semibold text-ink">הרשמה כעסק</p>
                <p className="text-[11px] text-inkMuted">מסעדה, מכולת ועוד</p>
              </div>
            </Link>
            <Link
              to="/register?type=courier"
              className="flex flex-col items-center gap-2 py-4 rounded border border-borderEditorial bg-white hover:border-ink transition-colors"
            >
              <UserGroupIcon className="w-5 h-5 text-ink" />
              <div className="text-center">
                <p className="text-[13px] font-semibold text-ink">הרשמה כשליח</p>
                <p className="text-[11px] text-inkMuted">הצטרף לצוות</p>
              </div>
            </Link>
          </div>

          {/* App download — desktop */}
          {showBanner && (
            <div className="hidden lg:block mt-8">
              <AppDownloadBanner />
            </div>
          )}

          {/* Footer */}
          <p className="text-center text-[11px] mt-8 text-inkMuted">
            © {new Date().getFullYear()} ZOOZ · כל הזכויות שמורות
          </p>
        </div>
      </div>
    </div>
  );
```

- [ ] **Step 3: Simplify the `RoleCard` helper to Editorial Light style**

Replace the existing `RoleCard` component definition (roughly lines 120–152) with:

```tsx
const RoleCard: React.FC<RoleCardProps> = ({ role, selected, onSelect }) => {
  const cfg = roleConfig[role];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex-1 flex flex-col items-center gap-2 py-4 px-2 rounded border transition-colors ${
        selected ? 'border-ink bg-white' : 'border-borderEditorial bg-white hover:border-ink'
      }`}
    >
      <div className="w-9 h-9 flex items-center justify-center text-ink">
        <span>{cfg.icon}</span>
      </div>
      <div className="text-center">
        <p className="font-serif text-[15px] text-ink" style={{ fontWeight: 400 }}>
          {cfg.label}
        </p>
        <p className="text-[10px] text-inkMuted mt-0.5 leading-tight">
          {cfg.sub}
        </p>
      </div>
    </button>
  );
};
```

- [ ] **Step 4: Simplify `AppDownloadBanner` to Editorial Light**

Replace the existing `AppDownloadBanner` definition with:

```tsx
const AppDownloadBanner: React.FC = () => {
  const device = detectDevice();
  return (
    <div className="w-full rounded border border-borderEditorial bg-white px-4 py-3 mb-5">
      <div className="flex items-center gap-3 mb-3">
        <DevicePhoneMobileIcon className="w-5 h-5 text-ink flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-ink text-[13px] font-semibold leading-tight">
            הורד את אפליקציית ZOOZ
          </p>
          <p className="text-inkMuted text-[11px] mt-0.5">
            גש לכל הפיצ׳רים ישירות מהנייד שלך
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        {(device === 'ios' || device === 'desktop') && <AppStoreBadge size="sm" />}
        {(device === 'android' || device === 'desktop') && <GooglePlayBadge size="sm" />}
      </div>
    </div>
  );
};
```

- [ ] **Step 5: Verify compile**

```bash
cd admin-panel && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 6: Verify in browser**

Navigate to `/login` (while logged out). Expected:
- Off-white `#fbfaf6` page background.
- Left panel (desktop ≥1024px): off-white, serif headline with italic `הביתה` in ruby, feature list with existing icons rendered in muted tone.
- Right panel: form card with serif headline "בחר את **סוג** החשבון שלך.", role selector (minimal), inputs, gradient primary button, two register links with thin borders.
- Mobile (<1024px): single column, brand on top, form below.
- Form submit still logs users in (sanity check: fill valid test credentials, submit, confirm toast + redirect).

- [ ] **Step 7: Commit**

```bash
git add admin-panel/src/pages/Login.tsx
git commit -m "refactor(login): restyle to Editorial Light (no logic change)"
```

---

## Task 16: Restyle Register page to Editorial Light

**Files:**
- Modify: `admin-panel/src/pages/Register.tsx`

- [ ] **Step 1: Read the file**

Read `admin-panel/src/pages/Register.tsx` and identify the visual structure. Like Login, it typically has a split layout with a brand panel on one side and a form on the other, plus tab switching between business/courier signup.

- [ ] **Step 2: Apply Editorial Light restyle**

Apply the same visual principles used in Task 15 to Register.tsx:

- Change page wrapper bg from the Stripe gradient or `#f6f9fc` to `bg-canvas`.
- Change left/brand panel to `bg-canvas` with `border-l border-borderEditorial` (remove dark gradient).
- Replace headline font with `font-serif` at `fontWeight: 400`; include an italic accent word in `#ea2261` in the hero headline.
- Change tab/segment control styling to the underline-on-active pattern used on Hero:
  ```tsx
  className={`px-4 pb-1 border-b-2 transition-colors ${active ? 'border-ink text-ink' : 'border-transparent text-inkMuted hover:text-ink'}`}
  ```
- Change inputs: keep the `<Input />` component, remove heavy color-per-tab styling. Use `border-borderEditorial` and `focus:border-ink` on inputs if Input accepts a className prop; otherwise leave Input visuals as-is (existing styles are acceptable).
- Change primary submit button to the editorial gradient: `style={{ background: 'linear-gradient(135deg, #533afd, #3d22e0)' }}`, `rounded` (4px), white text.
- Change secondary/outline buttons to `border border-ink text-ink rounded` (4px).
- Change any large rounded cards (`rounded-[12px]`, `rounded-[16px]`) to `rounded` or `rounded-lg` (8px) for cards.
- Remove any heavy `shadow-stripe-*` shadows; use `shadow-editorial-card` on elevated cards if a shadow is needed.
- Replace Heroicons with Phosphor equivalents only in new code you add; existing Heroicons usage may remain (out of scope to convert).
- Add a brand link at top that navigates to `/` so users can escape back to the landing page:
  ```tsx
  <Link to="/" className="font-serif text-ink text-[22px]" style={{ fontWeight: 400 }}>ZOOZ</Link>
  ```

All registration form logic (field state, validation, `handleSubmit`, redirect on success) must be preserved exactly — only JSX/className/inline-style edits.

- [ ] **Step 3: Verify compile**

```bash
cd admin-panel && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 4: Verify in browser**

Navigate to `/register?type=business` and `/register?type=courier` while logged out. Expected:
- Page renders on canvas, serif headline, editorial tabs.
- Tab switching still preselects the corresponding role based on the `type` query param.
- Form submission still creates the account (smoke test: use an email you can discard).
- Error handling (required fields missing, duplicate email) still shows toasts correctly.

- [ ] **Step 5: Commit**

```bash
git add admin-panel/src/pages/Register.tsx
git commit -m "refactor(register): restyle to Editorial Light (no logic change)"
```

---

## Task 17: Restyle ForgotPassword page to Editorial Light

**Files:**
- Modify: `admin-panel/src/pages/ForgotPassword.tsx`

- [ ] **Step 1: Read and restyle**

Read the file. Apply Editorial Light:
- Page wrapper: `min-h-screen bg-canvas flex items-center justify-center px-5`.
- Wrap the form in a card: `<div className="w-full max-w-md border border-borderEditorial bg-white rounded-lg p-8 shadow-editorial-card">`.
- Add brand link at top: `<Link to="/" className="block font-serif text-ink text-[22px] mb-4" style={{ fontWeight: 400 }}>ZOOZ</Link>`.
- Headline: `<h1 className="font-serif text-ink" style={{ fontSize: '28px', fontWeight: 400 }}>איפוס <em className="italic" style={{ color: '#ea2261' }}>סיסמה</em>.</h1>`
- Sub: `<p className="text-inkMuted text-[14px] mt-2 mb-6">הזן את כתובת האימייל שלך ונשלח קישור לאיפוס.</p>`
- Primary button: same editorial gradient as Task 15.
- Success state (after submission): replace its card with the same rounded editorial style; headline "נשלח ✓" in serif with italic accent.
- Remove any `rounded-[16px]` or heavy stripe shadows.

- [ ] **Step 2: Verify compile**

```bash
cd admin-panel && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 3: Verify in browser**

Navigate to `/forgot-password`. Expected:
- Centered card on canvas, serif headline, editorial form.
- Submit still fires the reset flow and transitions to success state.

- [ ] **Step 4: Commit**

```bash
git add admin-panel/src/pages/ForgotPassword.tsx
git commit -m "refactor(forgot-password): restyle to Editorial Light"
```

---

## Task 18: Restyle ResetPassword page to Editorial Light

**Files:**
- Modify: `admin-panel/src/pages/ResetPassword.tsx`

- [ ] **Step 1: Read and restyle**

Read the file. Apply the same pattern as Task 17:
- Canvas page + centered card + brand link + serif headline with italic accent.
- Headline suggestion: `קביעת סיסמה <em className="italic" style={{ color: '#ea2261' }}>חדשה</em>.`
- Password-strength indicator: retain its logic, simplify its visuals (4 segments in `#e8e6dc` that fill with `#111` ink as strength rises, remove colorful per-strength hues).
- Primary button: editorial gradient.
- Success state: auto-redirect behavior unchanged; restyle to match.

- [ ] **Step 2: Verify compile**

```bash
cd admin-panel && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 3: Verify in browser**

Navigate to `/reset-password?token=SOMETOKEN` (token validation will fail — that's fine). Expected:
- Canvas + centered card + serif headline render correctly.
- Invalid-token state still shows the appropriate error UI, restyled.

Smoke test with a valid flow if possible (use `/forgot-password` first to get a real token via email).

- [ ] **Step 4: Commit**

```bash
git add admin-panel/src/pages/ResetPassword.tsx
git commit -m "refactor(reset-password): restyle to Editorial Light"
```

---

## Task 19: Final QA pass

**Files:** None modified; verification only.

- [ ] **Step 1: Build passes**

```bash
cd admin-panel && npm run build
```
Expected: build completes without errors. Warnings about Tailwind class ordering or bundle size are acceptable.

- [ ] **Step 2: Type check**

```bash
cd admin-panel && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 3: Full flow smoke test**

With dev server running, clear localStorage, then:

1. Open `/` → landing page renders. Scroll through all sections; confirm no broken images or misaligned layout.
2. Click hero toggle → copy swaps between business/courier.
3. Click nav anchor links (`איך זה עובד`, `לעסקים`, etc.) → smooth scroll to sections.
4. Click `כניסה` in nav → `/login` loads, editorial style, form works.
5. From `/login`, click "הרשמה כעסק" → `/register?type=business` with business tab active.
6. From `/register`, attempt registration (use a disposable email), confirm success toast and redirect.
7. Log in with existing test credentials (business and courier accounts if available) → redirects to correct portal.
8. Log out; visit `/forgot-password` → submits, shows success state.
9. On `/login`, note that visiting `/` while logged in redirects to `/dashboard` / `/business/dashboard` / `/courier/dashboard` correctly.

- [ ] **Step 4: Responsive check**

Using DevTools device toolbar, verify each of `/`, `/login`, `/register`, `/forgot-password`, `/reset-password` at:
- 375×667 (iPhone SE)
- 768×1024 (iPad portrait)
- 1280×800 (laptop)
- 1920×1080 (desktop)

Confirm:
- No horizontal scrollbars.
- Text does not overflow containers.
- Tap targets ≥44px on mobile.
- RTL reading order correct (hero toggle `לעסקים` is to the right of `לשליחים`? Visually in RTL, the first item in source order appears on the right — correct).

- [ ] **Step 5: Lighthouse audit (optional but recommended)**

In Chrome DevTools → Lighthouse → run audit for `/` (incognito, mobile).
Expected (targets, not hard requirements):
- Performance ≥ 85
- Accessibility ≥ 95
- Best Practices ≥ 90

Note scores; any failures on Accessibility are high-priority to fix before shipping (missing alt text, color contrast, heading order).

- [ ] **Step 6: Final commit if any fixes made**

If any issues surfaced and were fixed during QA:
```bash
git add -A && git commit -m "fix(landing): QA adjustments"
```

Otherwise skip commit.

---

## Self-review checklist (run before handing off)

Spec coverage check — each §X in the spec maps to at least one task:

- §3.1 Routing → Task 14.
- §3.2 New files → Tasks 2–13.
- §3.3 Modified files → Tasks 1, 14, 15, 16, 17, 18.
- §3.4 No backend → enforced by plan scope (no backend tasks).
- §4 Visual language → Task 1 (tokens) + applied in Tasks 3–13 and 15–18.
- §5.1 LandingNav → Task 3.
- §5.2 Hero → Task 4.
- §5.3 HowItWorks → Task 5.
- §5.4 BusinessSection → Task 6.
- §5.5 CourierSection → Task 7.
- §5.6 Coverage → Task 8.
- §5.7 SocialProof → Task 9.
- §5.8 FAQ → Task 10.
- §5.9 FinalCTA → Task 11.
- §5.10 LandingFooter → Task 12.
- §6 Auth restyle → Tasks 15–18.
- §7 Data flow → Tasks 2, 4 (only state is hero tab).
- §8 Error handling → preserved in Tasks 15–18 (logic unchanged).
- §9 Placeholders marked → Task 2 (PLACEHOLDER_* prefix).
- §10 Accessibility → Tasks 3–13 use semantic HTML, aria-selected, aria-hidden; verified in Task 19 step 5.
- §11 Responsive → Tailwind breakpoints throughout; verified in Task 19 step 4.
- §12 Testing → Task 19.

No placeholders, no TBDs, no "handle errors appropriately" phrasing. Every file path is exact. Every code change shows the code. Naming consistency: `font-serif` used throughout, `borderEditorial` token, `bg-canvas`, `text-ink`, `text-inkMuted` used consistently.
