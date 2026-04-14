# אשדוד-שליח 🚚

פלטפורמת משלוחים חכמה ומבוססת-AI לעיר אשדוד והסביבה.

---

## מבנה הפרויקט

```
אשדוד-שליח/
├── backend/          # Node.js + Express + TypeScript — שרת API
├── admin-panel/      # React + Vite + Tailwind — פאנל ניהול (Web)
├── business-app/     # React Native + Expo — אפליקציית עסקים
└── courier-app/      # React Native + Expo — אפליקציית שליחים
```

---

## הפעלה מהירה

### 1. Backend API

```bash
cd backend
npm install
cp .env.example .env   # מלא את הפרטים
npm run dev
# רץ על http://localhost:3001
```

### 2. Admin Panel

```bash
cd admin-panel
npm install
npm run dev
# רץ על http://localhost:3000
# כניסת דמו: לחץ "כניסת דמו (פיתוח)"
```

### 3. Business App (Expo)

```bash
cd business-app
npm install
npx expo start
```

### 4. Courier App (Expo)

```bash
cd courier-app
npm install
npx expo start
```

---

## משתני סביבה — Backend (.env)

```env
PORT=3001
NODE_ENV=development

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# Google Maps
GOOGLE_MAPS_API_KEY=your-google-maps-key

# FCM Push Notifications
FCM_SERVER_KEY=your-fcm-server-key

# CORS
CORS_ORIGIN=http://localhost:3000
```

---

## טכנולוגיות

| רכיב | טכנולוגיה |
|------|-----------|
| Backend | Node.js, Express, TypeScript, Socket.io |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Push | Firebase Cloud Messaging (FCM) |
| Maps | Google Maps API |
| Admin Panel | React 18, Vite, Tailwind CSS, Redux Toolkit |
| Mobile Apps | React Native, Expo 49, Redux Toolkit |
| AI Engine | מנוע פנימי — dispatch חכם, תמחור דינמי |

---

## API Endpoints

### Auth
| Method | Path | תיאור |
|--------|------|-------|
| POST | /api/v1/auth/register | הרשמה |
| POST | /api/v1/auth/login | כניסה |
| GET | /api/v1/auth/profile | פרופיל משתמש |

### Deliveries
| Method | Path | תיאור |
|--------|------|-------|
| POST | /api/v1/deliveries | יצירת משלוח |
| GET | /api/v1/deliveries | רשימת משלוחים |
| GET | /api/v1/deliveries/:id | משלוח ספציפי |
| PUT | /api/v1/deliveries/:id | עדכון משלוח |
| DELETE | /api/v1/deliveries/:id/cancel | ביטול משלוח |

### Couriers
| Method | Path | תיאור |
|--------|------|-------|
| PUT | /api/v1/couriers/availability | עדכון זמינות |
| PUT | /api/v1/couriers/location | עדכון מיקום GPS |
| POST | /api/v1/couriers/:id/accept | קבלת משלוח |
| POST | /api/v1/couriers/:id/pickup | איסוף חבילה |
| POST | /api/v1/couriers/:id/complete | השלמת משלוח |

### Pricing
| Method | Path | תיאור |
|--------|------|-------|
| GET | /api/v1/pricing/zones | כל האזורים |
| POST | /api/v1/pricing/calculate | חישוב מחיר |
| PUT | /api/v1/pricing/zones/:id | עדכון מחיר (מנהל) |

### Admin
| Method | Path | תיאור |
|--------|------|-------|
| GET | /api/v1/admin/dashboard | סטטיסטיקות |
| POST | /api/v1/admin/block/:userId | חסימת משתמש |
| GET | /api/v1/admin/reports/revenue | דוח הכנסות |

---

## מחירון

| יעד | מחיר |
|-----|------|
| אשדוד (בעיר) | ₪25 |
| א.ת צפונית | ₪35 |
| גן יבנה / עזריקים | ₪45 |
| חצור | ₪60 |
| חצב / גבעת ושינגטון | ₪70 |
| יבנה / באר גנים / ניצן | ₪100 |
| אשקלון | ₪120 |
| שדרות | ₪170 |
| קריית גת | ₪180 |
| נתיבות | ₪260 |
| באר שבע | ₪350 |
| דימונה / ירוחם / ערד | ₪400 |

> ניהול מלא של המחירון זמין בפאנל הניהול תחת "תמחור"

---

## מנגנון Dispatch

1. עסק יוצר משלוח → מחיר מחושב אוטומטית
2. מנוע ה-AI מדרג שליחים זמינים לפי: מרחק (40%), דירוג (30%), עומס (20%), כלי רכב (10%)
3. 5 השליחים המובילים מקבלים התראת Push + Popup באפליקציה
4. הראשון שמאשר תוך 45 שניות מקבל את המשלוח
5. אם אף אחד לא אישר — חוזר חלילה עם הודעה לעסק

---

## מערכת בונוסים

| תנאי | בונוס |
|------|-------|
| גשם קל | +₪15 |
| סופת גשמים | +₪30 |
| לילה (22:00–06:00) | +₪20 |
| שעות עומס (12–14, 19–21) | +₪10 |
| אזור מסוכן | +₪25 |
| משלוח דחוף | +₪20 |
| עומס גבוה באזור | +₪15 |

---

## Socket.io Events

| Event | כיוון | תיאור |
|-------|-------|-------|
| `delivery:offer` | Server → Courier | הצעת משלוח חדשה |
| `delivery:status` | Server → All | עדכון סטטוס משלוח |
| `courier:location` | Courier → Server | עדכון מיקום |
| `chat:message` | Bidirectional | הודעת צ'אט |
| `delivery:accepted` | Server → Business | שליח אישר |

---

## הגדרת Firebase

1. צור פרויקט ב-[Firebase Console](https://console.firebase.google.com)
2. הפעל: **Authentication** (Email/Password), **Firestore**, **Cloud Messaging**
3. הורד `serviceAccountKey.json` והעתק פרטים ל-.env
4. הוסף את קבצי `google-services.json` (Android) ו-`GoogleService-Info.plist` (iOS) לתוך תיקיות האפליקציות

---

## Firestore Collections

| Collection | תיאור |
|-----------|-------|
| `users` | כל המשתמשים (עסקים, שליחים, מנהלים) |
| `deliveries` | כל המשלוחים |
| `pricing_zones` | אזורים ומחירים |
| `bonus_rules` | חוקי בונוסים |
| `chat_messages` | הודעות צ'אט |
| `ratings` | דירוגים דו-כיווניים |
| `courier_locations` | מיקומי שליחים בזמן אמת |
| `notifications` | היסטוריית התראות |

---

## רישיון

© 2026 אשדוד-שליח. כל הזכויות שמורות.
