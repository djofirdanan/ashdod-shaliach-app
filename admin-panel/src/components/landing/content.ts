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
