# Google Maps API Setup

## Current Key
Set in `admin-panel/.env.local` as `VITE_GOOGLE_MAPS_API_KEY`.  
**Never commit this file to git** — it is already in `.gitignore`.

## APIs Required
Enable these in Google Cloud Console → APIs & Services → Enabled APIs:

| API | Used by |
|-----|---------|
| **Maps JavaScript API** | `DeliveryMap.tsx`, `CourierDeliveries.tsx` — renders the delivery map |
| **Places API** | `AddressAutocomplete.tsx` — address autocomplete in Register, BusinessProfile |
| **Geocoding API** | `DeliveryMap.tsx`, `AvailableDeliveries.tsx`, `CourierDeliveries.tsx` — converts addresses to lat/lng |
| **Directions API** | `DeliveryMap.tsx`, `CourierDeliveries.tsx` — draws route between pickup and drop |

## How to Enable / Fix

1. Go to https://console.cloud.google.com/
2. Select your project (or create one named `zooz-delivery`)
3. Go to **APIs & Services → Library**
4. Search and enable each API in the table above
5. Go to **APIs & Services → Credentials**
6. Click your API key → **Edit**
7. Under **API restrictions**, select "Restrict key" and add:
   - Maps JavaScript API
   - Places API
   - Geocoding API
   - Directions API
8. Under **Application restrictions**, add **HTTP referrers**:
   - `http://localhost:3000/*` (development)
   - `https://yourdomain.com/*` (production — add when you deploy)
9. Click **Save**

## Common Errors

| Console message | Fix |
|-----------------|-----|
| `ApiNotActivatedMapError` | The specific API is not enabled — enable it in step 4 |
| `REQUEST_DENIED` | API key restriction too tight, or billing not enabled |
| `InvalidKeyMapError` | Wrong key in `.env.local` — check `VITE_GOOGLE_MAPS_API_KEY` |
| Autocomplete shows no suggestions | Places API not enabled, or billing not activated |

## Billing Note
Google Maps APIs require a billing account.  
New accounts get **$200/month free credit** which covers typical development usage.  
Enable billing at: https://console.cloud.google.com/billing

## Status
☐ APIs enabled (run dev server, open Register page, try typing an address — should show suggestions)  
☐ API key restricted to the 4 APIs above  
☐ HTTP referrer restriction includes `http://localhost:3000/*`
