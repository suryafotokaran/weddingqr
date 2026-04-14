# WeddingQR — Complete Project Documentation

> Comprehensive reference for the entire WeddingQR platform: database schema, image upload flows, payment system, admin panel, and all architectural decisions.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Folder Structure](#2-folder-structure)
3. [Client App — All Pages & Routes](#3-client-app--all-pages--routes)
4. [Client App — Components](#4-client-app--components)
5. [Client App — Context, Hooks & Utilities](#5-client-app--context-hooks--utilities)
6. [Image Upload — Complete Flow](#6-image-upload--complete-flow)
7. [Supabase Database Schema](#7-supabase-database-schema)
8. [Supabase Edge Functions](#8-supabase-edge-functions)
9. [Payment & Subscription Flow](#9-payment--subscription-flow)
10. [Authentication Flow](#10-authentication-flow)
11. [Guest Experience Flow](#11-guest-experience-flow)
12. [Admin Panel — All Pages](#12-admin-panel--all-pages)
13. [Storage — Cloudflare R2](#13-storage--cloudflare-r2)
14. [Environment Variables](#14-environment-variables)
15. [Tech Stack Summary](#15-tech-stack-summary)

---

## 1. Project Overview

WeddingQR is a SaaS platform for photographers to:
- Create events (weddings, birthdays, etc.)
- Generate QR codes for guests to upload photos
- Host an AI-powered gallery with face recognition
- Sell plans (per-event or monthly subscriptions)
- Let guests view, heart, and download photos

**Two Apps:**
- `client/` — Photographer + Guest app (public-facing)
- `admin/` — Internal admin dashboard

---

## 2. Folder Structure

```
WeddingQR/
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── auth/              # SignIn, SignUp, ForgotPassword, OtpVerify, ConfirmPassword
│   │   │   ├── Studio.jsx         # Main dashboard
│   │   │   ├── Events.jsx         # Event listing
│   │   │   ├── CreateEvent.jsx    # Create new event
│   │   │   ├── EventLanding.jsx   # Single event overview
│   │   │   ├── EventDetail.jsx    # Photo management
│   │   │   ├── GuestUpload.jsx    # Guest upload (public)
│   │   │   ├── QRUpload.jsx       # QR-based upload (auth)
│   │   │   ├── QRView.jsx         # QR view page (public)
│   │   │   ├── GuestEventView.jsx # Guest gallery (public)
│   │   │   ├── Pricing.jsx        # Plan selection
│   │   │   ├── Payments.jsx       # Payment history
│   │   │   └── Profile.jsx        # User profile
│   │   ├── components/
│   │   │   ├── DashboardLayout.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── Toast.jsx
│   │   │   ├── ConfirmModal.jsx
│   │   │   ├── UpgradePlan.jsx
│   │   │   └── MonthlyUpgradePlan.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── hooks/
│   │   │   └── useCurrentUser.js
│   │   ├── lib/
│   │   │   ├── supabase.js        # Supabase client
│   │   │   ├── s3.js              # Cloudflare R2 helpers
│   │   │   └── razorpay.js        # Razorpay helpers
│   │   ├── App.jsx                # Router config
│   │   └── main.jsx
│   ├── public/
│   │   └── models/                # Face-API ML model files (manifest + weights)
│   ├── supabase/
│   │   ├── functions/
│   │   │   ├── create-razorpay-order/index.ts
│   │   │   └── verify-razorpay-payment/index.ts
│   │   └── migrations/            # SQL migration files
│   ├── vite.config.js
│   └── package.json
│
├── admin/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Users.jsx
│   │   │   ├── UserDetail.jsx
│   │   │   ├── Plans.jsx
│   │   │   └── SignIn.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── lib/
│   │   │   └── supabase.js
│   │   └── components/
│   │       └── ProtectedRoute.jsx
│   ├── vite.config.js
│   └── package.json
│
└── PROJECT_DOCS.md
```

---

## 3. Client App — All Pages & Routes

| Route | File | Auth Required | Purpose |
|-------|------|:---:|---------|
| `/` | `Landing.jsx` | No | Public landing / marketing page |
| `/signin` | `auth/SignIn.jsx` | No | User login |
| `/signup` | `auth/SignUp.jsx` | No | User registration |
| `/forgot-password` | `auth/ForgotPassword.jsx` | No | Password reset request |
| `/otp` | `auth/OtpVerify.jsx` | No | OTP verification |
| `/confirm-password` | `auth/ConfirmPassword.jsx` | No | Set new password |
| `/studio` | `Studio.jsx` | Yes | Main photographer dashboard |
| `/profile` | `Profile.jsx` | Yes | Edit studio name, full name |
| `/pricing` | `Pricing.jsx` | Yes | Per-event & monthly plan selection |
| `/payments` | `Payments.jsx` | Yes | View payment & purchase history |
| `/events` | `Events.jsx` | Yes | List all events |
| `/createevent` | `CreateEvent.jsx` | Yes | Create a new event |
| `/events/:id` | `EventLanding.jsx` | Yes | Event overview, QR code, sharing |
| `/events/:id/photos` | `EventDetail.jsx` | Yes | View, manage, delete photos |
| `/events/:id/qr-upload` | `QRUpload.jsx` | Yes | Upload photos via QR (photographer) |
| `/upload/:id` | `GuestUpload.jsx` | No | Guest photo upload (public link) |
| `/v/:id` | `GuestEventView.jsx` | No | Guest gallery view (public) |
| `/qr/:id` | `QRView.jsx` | No | QR redirect / landing |

---

## 4. Client App — Components

### `DashboardLayout.jsx`
- Sidebar navigation wrapper for all protected pages
- Includes: nav links, user info, sign-out button

### `ProtectedRoute.jsx`
- Checks `AuthContext` for `user` object
- Redirects to `/signin` if unauthenticated

### `Toast.jsx`
- Global notification toast (success / error / info)

### `ConfirmModal.jsx`
- Reusable confirmation dialog (used for delete actions)
- Props: `isOpen`, `onConfirm`, `onCancel`, `message`

### `UpgradePlan.jsx`
- Modal shown when user hits per-event plan limits
- Triggers Razorpay checkout for plan upgrade

### `MonthlyUpgradePlan.jsx`
- Modal for switching to monthly subscription

---

## 5. Client App — Context, Hooks & Utilities

### `context/AuthContext.jsx`

Wraps entire app, provides auth state via React Context.

```js
// Usage
const { user, session, loading, signIn, signOut, signUp } = useAuth();
```

**Methods:**
| Method | Supabase Call | Notes |
|--------|--------------|-------|
| `signUp(email, password, metadata)` | `supabase.auth.signUp()` | metadata: `{ full_name, studio_name }` |
| `signIn(email, password)` | `supabase.auth.signInWithPassword()` | |
| `signOut()` | `supabase.auth.signOut()` | |
| `resetPassword(email)` | `supabase.auth.resetPasswordForEmail()` | |
| `updatePassword(newPassword)` | `supabase.auth.updateUser()` | |

Listens to: `supabase.auth.onAuthStateChange()` for real-time session updates.

---

### `hooks/useCurrentUser.js`

React Query hook to get current user metadata.

```js
const { studioName, fullName, user } = useCurrentUser();
```

- Fetches `user_metadata` from `supabase.auth.getUser()`
- Caches for **5 minutes**
- Auto-invalidates on sign-out

---

### `lib/supabase.js`

```js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default supabase;
```

---

### `lib/s3.js` — Cloudflare R2 (S3-compatible)

All image storage goes through R2. Key functions:

#### `uploadToR2(file, storagePath)`
1. Generates a **presigned PUT URL** (1 hour expiry) via AWS SDK v3
2. Uploads file via native `fetch()` with PUT
3. Returns the storage path on success

#### `getSignedPhotoUrls(photos[])`
1. Takes array of photo objects with `storage_path`
2. Generates **presigned GET URLs** (1 hour expiry) for each
3. Skips any Supabase CDN URLs (old data)
4. Returns: `{ photoId: signedUrl, ... }`

#### `deleteFromR2(storagePaths[])`
- Batch delete objects from R2 bucket
- Called when photographer deletes photos

#### `buildR2RefUrl(storagePath)`
- Returns a non-signed reference URL (used for DB storage, not for display)
- Stored in `photos.supabase_url` column

**Required Env Vars:**
```
VITE_R2_BUCKET
VITE_R2_ENDPOINT         # e.g. https://xxx.r2.cloudflarestorage.com
VITE_R2_ACCESS_KEY_ID
VITE_R2_SECRET_ACCESS_KEY
```

---

### `lib/razorpay.js` — Payment Gateway

#### `loadRazorpayScript()`
- Lazy-loads `checkout.js` from Razorpay CDN
- Returns Promise (resolves when script is ready)

#### `openRazorpayCheckout(options)`
- Opens Razorpay payment popup
- Options: `{ orderId, amount, plan, user, onSuccess, onFailure }`
- `onSuccess` receives: `{ razorpay_payment_id, razorpay_order_id, razorpay_signature }`

---

## 6. Image Upload — Complete Flow

### A. Guest Upload (`/upload/:id`) — `GuestUpload.jsx`

Public page. Anyone with the link can upload photos to an event.

**Storage Path Pattern:**
```
{owner_user_id}/{event_name_slugified}/qrupload/{timestamp}_{random}.{ext}
```
Example: `abc-123/priya-wedding/qrupload/1712345678_xk9.jpg`

**Step-by-Step Flow:**

1. **Load Event** — `supabase.from('events').select('*').eq('id', eventId)`
   - Checks: event exists, `is_public` is true
   - Gets: `max_image_size_mb`, `storage_gb`, `user_id`, `name`

2. **Load Face-API Models** — from `/public/models/`
   - `ssdMobilenetv1` — Face detection
   - `faceLandmark68Net` — Facial landmark detection
   - `faceRecognitionNet` — 128D face embedding extraction

3. **User Selects Files** — drag-drop or file input

4. **Per-File Validation:**
   - Must be image type (`image/*`)
   - File size must be ≤ `event.max_image_size_mb`

5. **Upload to R2** — `uploadToR2(file, storagePath)`

6. **Insert into `photos` table:**
   ```js
   supabase.from('photos').insert({
     event_id: eventId,
     user_id: null,           // Guests don't have user_id
     storage_path: storagePath,
     file_name: file.name,
     size_bytes: file.size,
     supabase_url: buildR2RefUrl(storagePath),
     source: 'guest',
   })
   ```

7. **Face Embedding Extraction:**
   - Draw image on canvas
   - Run `faceapi.detectAllFaces().withFaceLandmarks().withFaceDescriptors()`
   - For each detected face, insert into `face_embeddings`:
     ```js
     supabase.from('face_embeddings').insert({
       photo_id: photoId,
       embedding: Array.from(descriptor), // 128 floats
     })
     ```

8. **Show success toast** — Photo uploaded message

---

### B. QR Upload (`/events/:id/qr-upload`) — `QRUpload.jsx`

Photographer-only authenticated upload. Same flow as guest upload but:
- User must be signed in
- `source` field is `'qrupload'` instead of `'guest'`
- `user_id` is the photographer's ID (not null)

---

### C. Photo Management (`/events/:id/photos`) — `EventDetail.jsx`

**View Photos:**
```js
// 1. Fetch all photos for event
const { data: photos } = await supabase
  .from('photos')
  .select('*')
  .eq('event_id', eventId)
  .order('created_at', { ascending: false });

// 2. Generate signed URLs for display
const signedUrls = await getSignedPhotoUrls(photos);
```

**Delete Photo:**
```js
// 1. Delete from R2
await deleteFromR2([photo.storage_path]);

// 2. Delete from database (cascade deletes face_embeddings)
await supabase.from('photos').delete().eq('id', photoId);
```

---

## 7. Supabase Database Schema

### `events` table

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Event identifier |
| `user_id` | uuid (FK → auth.users) | Photographer who owns this event |
| `name` | text | Event name (e.g., "Priya & Rahul Wedding") |
| `type` | text | Event type (Wedding, Birthday, etc.) |
| `date` | date | Event date |
| `photos_limit` | int | Max number of photos allowed |
| `storage_gb` | decimal | Storage quota in GB |
| `max_image_size_mb` | int | Per-image size limit in MB |
| `purchase_id` | uuid (FK → purchases) | Linked per-event purchase |
| `subscription_id` | uuid (FK → subscriptions) | Linked monthly subscription |
| `is_public` | boolean | Whether guest upload link is active |
| `password` | text | Optional gallery password (nullable) |
| `theme_color` | text | Hex color for guest gallery UI |
| `allow_screenshot` | boolean | Block right-click/print in gallery |
| `allow_download` | boolean | Show download button in gallery |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### `photos` table

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Photo identifier |
| `event_id` | uuid (FK → events) | Which event this belongs to |
| `user_id` | uuid (FK → auth.users) | Uploader (null for guest uploads) |
| `storage_path` | text | R2 object key (used for presigned URLs) |
| `file_name` | text | Original filename |
| `size_bytes` | bigint | File size in bytes |
| `supabase_url` | text | Non-signed reference URL (stored, not displayed) |
| `source` | text | `'guest'` or `'qrupload'` |
| `likes` | int | Like/heart count |
| `created_at` | timestamptz | |

---

### `face_embeddings` table

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `photo_id` | uuid (FK → photos) | Which photo this face is from |
| `embedding` | json | Array of 128 floats `[0.123, 0.456, ...]` (128D face vector) |

Used for: matching guest faces to photos in the gallery.

---

### `guest_selections` table

| Column | Type | Description |
|--------|------|-------------|
| `event_id` | uuid (FK → events) | |
| `photo_id` | uuid (FK → photos) | |
| `guest_id` | uuid | Random UUID stored in guest's `localStorage` |
| `created_at` | timestamptz | |

Used for: tracking which photos a guest "hearted" across sessions.

---

### `purchases` table (Per-Event Plans)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK → auth.users) | |
| `plan` | text | `'basic'` \| `'pro'` \| `'premium'` |
| `quantity` | int | Usually 1 |
| `events_granted` | int | Always 9999 (deprecated concept) |
| `amount_paise` | bigint | Amount in paise (₹ × 100) |
| `razorpay_order_id` | text | Razorpay order ID |
| `razorpay_payment_id` | text | Razorpay payment ID (null until verified) |
| `status` | text | `'pending'` \| `'paid'` \| `'failed'` |
| `created_at` | timestamptz | |

---

### `subscriptions` table (Monthly Plans)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK → auth.users) | |
| `plan_key` | text | `'monthly_starter'` \| `'monthly_pro'` \| `'monthly_elite'` |
| `storage_gb` | int | Storage quota |
| `max_image_size_mb` | int | Per-image size limit |
| `amount_paise` | bigint | Monthly charge in paise |
| `razorpay_order_id` | text | |
| `razorpay_payment_id` | text | |
| `status` | text | `'pending'` \| `'active'` \| `'cancelled'` |
| `start_date` | timestamptz | When subscription started |
| `end_date` | timestamptz | 30 days from start_date |
| `created_at` | timestamptz | |

---

### `plan_configs` table (Per-Event Pricing Config)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `key` | text | `'basic'` \| `'pro'` \| `'premium'` |
| `label` | text | Display name |
| `amount_paise` | bigint | Price in paise |
| `storage_gb` | int | |
| `max_image_size_mb` | int | |
| `photos_limit` | int | 500 / 1000 / 2000 |
| `tagline` | text | Marketing copy |
| `is_active` | boolean | Whether plan is visible in UI |

---

### `monthly_plan_configs` table (Monthly Pricing Config)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `key` | text | `'monthly_starter'` \| `'monthly_pro'` \| `'monthly_elite'` |
| `label` | text | Display name |
| `amount_paise` | bigint | Monthly price in paise |
| `storage_gb` | int | |
| `max_image_size_mb` | int | |
| `tagline` | text | |
| `is_active` | boolean | |

---

### Database Relationships Diagram

```
auth.users
    │
    ├──── events (user_id)
    │         │
    │         ├──── photos (event_id)
    │         │         │
    │         │         └──── face_embeddings (photo_id)
    │         │         └──── guest_selections (photo_id)
    │         │
    │         ├──── purchase_id ──── purchases (id)
    │         └──── subscription_id ── subscriptions (id)
    │
    ├──── purchases (user_id)
    └──── subscriptions (user_id)
```

---

### RPC Functions (PostgreSQL)

| Function | Called From | Returns |
|----------|------------|---------|
| `admin_get_stats()` | Admin Dashboard | `{ totalUsers, totalEvents, activePlanUsers, paidNoEvent, recentReg[], recentPaid[] }` |
| `admin_get_users()` | Admin Users page | Full user list with stats |
| `increment_likes(p_photo_id)` | Guest gallery (heart button) | void |
| `decrement_likes(p_photo_id)` | Guest gallery (unheart) | void |
| `increment_event_photos_limit(p_event_id, p_additional)` | After upgrade purchase | void |

---

### Row Level Security (RLS) Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `events` | Owner only | Owner | Owner | Owner |
| `photos` | Public (for guest galleries) | Owner / Service Role | Owner | Owner |
| `face_embeddings` | Owner | Service Role | — | Cascade from photos |
| `guest_selections` | Public | Public (guests) | — | — |
| `purchases` | Owner only | Service Role (Edge Fn) | Service Role | — |
| `subscriptions` | Owner only | Service Role (Edge Fn) | Service Role | — |
| `plan_configs` | Public (read) | Admin only | Admin only | Admin only |
| `monthly_plan_configs` | Public (read) | Admin only | Admin only | Admin only |

---

## 8. Supabase Edge Functions

Located in: `client/supabase/functions/`

All functions run on Deno. Called with user's JWT in `Authorization` header.

---

### `create-razorpay-order`

**Endpoint:** `POST /functions/v1/create-razorpay-order`

**Request Body:**
```json
{
  "plan": "pro",
  "amountPaise": 299900,
  "photosLimit": 1000,
  "customLabel": null,
  "eventId": null,
  "orderType": "per_event"
}
```

**Logic:**
1. Verify JWT → get `user_id`
2. Resolve plan config (hardcoded in function):
   - `basic`: 500 photos, 5GB
   - `pro`: 1000 photos, 10GB
   - `premium`: 2000 photos, 20GB
3. Create Razorpay order:
   ```
   POST https://api.razorpay.com/v1/orders
   Auth: Basic base64(key_id:key_secret)
   Body: { amount, currency: 'INR', receipt: 'wqr_{userId}_{ts}', notes: { plan, user_id, ... } }
   ```
4. Insert into `purchases` table with `status: 'pending'`
5. Return `{ orderId, amount, currency, photosLimit, storageGb }`

---

### `verify-razorpay-payment`

**Endpoint:** `POST /functions/v1/verify-razorpay-payment`

**Request Body:**
```json
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "abc123...",
  "plan": "pro",
  "amountPaise": 299900,
  "eventId": null,
  "additionalPhotos": null,
  "orderType": "per_event"
}
```

**Logic:**
1. Verify JWT → get `user_id`
2. **Verify HMAC-SHA256 signature:**
   ```
   expectedSig = HMAC-SHA256(order_id + "|" + payment_id, RAZORPAY_KEY_SECRET)
   if (expectedSig !== razorpay_signature) → reject
   ```
3. Update `purchases` table:
   ```sql
   UPDATE purchases SET razorpay_payment_id = ?, status = 'paid'
   WHERE razorpay_order_id = ? AND user_id = ?
   ```
4. If `eventId` provided (photo limit upgrade):
   ```sql
   SELECT increment_event_photos_limit(eventId, additionalPhotos)
   ```
5. Return `{ success: true, purchaseId, plan, photosLimit, storageGb }`

---

## 9. Payment & Subscription Flow

### Two Billing Models

**A. Per-Event (One-time purchase)**
- Plan selected on `/pricing` page
- Linked to one event via `events.purchase_id`
- Plans: `basic` / `pro` / `premium`

**B. Monthly Subscription (Recurring)**
- Plan selected on `/pricing` page (monthly tab)
- Shared storage across all events created that month
- Plans: `monthly_starter` / `monthly_pro` / `monthly_elite`
- Events linked via `events.subscription_id`

---

### Full Payment Flow (Step by Step)

```
User → /pricing page
         │
         ▼
1. Load plan_configs from Supabase (SELECT * FROM plan_configs WHERE is_active = true)
         │
         ▼
2. User clicks "Buy Plan"
         │
         ▼
3. POST /functions/v1/create-razorpay-order
   → Supabase Edge Function creates Razorpay order + inserts pending purchase
   ← Returns: orderId, amount
         │
         ▼
4. openRazorpayCheckout({ orderId, amount, ... })
   → Razorpay popup opens
   → User enters card/UPI
   ← Returns: { razorpay_payment_id, razorpay_order_id, razorpay_signature }
         │
         ▼
5. POST /functions/v1/verify-razorpay-payment
   → Verifies HMAC signature
   → Updates purchase status to 'paid'
   ← Returns: { purchaseId, plan, photosLimit, storageGb }
         │
         ▼
6. Store purchase in sessionStorage
   Navigate to /createevent
         │
         ▼
7. Create event → linked to purchaseId or subscriptionId
```

---

## 10. Authentication Flow

### Sign Up
```js
supabase.auth.signUp({
  email,
  password,
  options: {
    data: { full_name, studio_name }
  }
})
```

### Sign In
```js
supabase.auth.signInWithPassword({ email, password })
```

### Session Handling
- `AuthContext` calls `supabase.auth.onAuthStateChange()` on mount
- Stores `user` and `session` in React state
- Session token auto-refreshed by Supabase client

### Edge Function Auth
- Client sends `Authorization: Bearer {session.access_token}` header
- Edge Function verifies with `supabase.auth.getUser(token)`

### Protected Routes
- `ProtectedRoute` component wraps all auth-required pages
- Checks `user` from `AuthContext`
- Redirects to `/signin` if null

---

## 11. Guest Experience Flow

### Guest Upload (`/upload/:id`)

1. Photographer shares link: `https://app.weddingqr.com/upload/{eventId}`
2. Guest opens link → sees event name + upload area
3. Guest drags or selects photos
4. Files validated (type + size limit from event config)
5. Each photo:
   - Uploaded to R2
   - Inserted into `photos` table (`source: 'guest'`)
   - Face embeddings extracted + stored in `face_embeddings`
6. Guest sees success confirmation

### Guest Gallery (`/v/:id`)

1. Guest opens link: `https://app.weddingqr.com/v/{eventId}`
2. If event has `password`:
   - Show password form
   - Validate against `events.password`
   - Store verified status in `localStorage`
3. Load all photos → generate R2 presigned URLs
4. Display photo grid with two tabs:
   - **All Photos** — all event photos
   - **Your Hearts** — photos this guest favorited
5. Guest hearts a photo:
   - `supabase.rpc('increment_likes', { p_photo_id })`
   - `supabase.from('guest_selections').insert({ event_id, photo_id, guest_id })`
   - `guest_id` = random UUID generated once, stored in `localStorage`
6. Security (if `allow_screenshot = false`):
   - Disabled: right-click, Ctrl+S, Ctrl+U, F12, Print
7. Download (if `allow_download = true`):
   - Download button visible for each photo

---

## 12. Admin Panel — All Pages

Admin app runs separately at a different port/domain.

### Dashboard (`/dashboard`)

```js
supabase.rpc('admin_get_stats')
```

Returns and displays:
- Total registered users
- Total events created
- Active plan users (paid)
- Paid users with no event yet
- Recent registrations table
- Recent payments table

### Users (`/users`)

```js
supabase.rpc('admin_get_users')
```

Shows user list with:
- Email, Studio Name, Full Name
- Event count, Photo count
- Top plan purchased
- Searchable by email/studio/name
- Click row → goes to UserDetail

### User Detail (`/users/:id`)

Deep dive on one user:
- Auth profile info
- All events created
- Payment/purchase history
- Storage usage breakdown

### Plans (`/plans`)

CRUD interface for:
- `plan_configs` (per-event plans)
- `monthly_plan_configs` (monthly plans)

Admin can: edit pricing, storage, photos_limit, tagline, activate/deactivate plans.

### Sign In (`/signin`)

Admin-only login using Supabase auth. Same user table but presumably protected by RLS or separate role check.

---

## 13. Storage — Cloudflare R2

All photos are stored in **Cloudflare R2** (S3-compatible, cheaper egress than AWS S3).

### Storage Path Convention

```
{owner_user_id}/{event_name_slug}/{source}/{timestamp}_{random}.{ext}
```

Examples:
```
f47ac10b-58cc/priya-wedding/qrupload/1712345678_xk9.jpg
f47ac10b-58cc/rahul-birthday/guest/1712399999_ab2.png
```

### URL Strategy

| Use Case | URL Type | Expiry |
|----------|----------|--------|
| Display photos in app | Presigned GET URL | 1 hour |
| Upload from client | Presigned PUT URL | 1 hour |
| DB reference | Non-signed reference URL | Never expires |

### Why Presigned URLs?

- R2 bucket is **private** (no public access)
- Every display request generates a fresh signed URL
- `getSignedPhotoUrls()` batches URL generation for entire photo list

---

## 14. Environment Variables

### Client App (`client/.env.local`)

```env
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...

# Cloudflare R2
VITE_R2_BUCKET=your-bucket-name
VITE_R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
VITE_R2_ACCESS_KEY_ID=your-access-key
VITE_R2_SECRET_ACCESS_KEY=your-secret-key

# Razorpay
VITE_RAZORPAY_KEY_ID=rzp_live_xxx
```

### Admin App (`admin/.env.local`)

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

### Supabase Edge Functions (Deno env via `supabase secrets set`)

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...  # Has full DB access, bypasses RLS
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=your-secret
```

---

## 15. Tech Stack Summary

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Frontend Framework | React | 19.2.4 | UI components + state |
| Build Tool | Vite | Latest | Fast dev server, HMR, production builds |
| Styling | Tailwind CSS | v4 | Utility-first CSS |
| Routing | React Router | v7 | Client-side routing |
| State (Server) | React Query (TanStack) | v5 | Server state, caching |
| State (Auth) | React Context | — | Auth session state |
| Database | Supabase (PostgreSQL) | — | Tables, RLS, RPCs, Auth |
| Auth | Supabase Auth | — | Email/password, JWT sessions |
| Image Storage | Cloudflare R2 | — | S3-compatible object storage |
| Payments | Razorpay | — | Indian payment gateway |
| Face Recognition | face-api.js (Vladimir Mandic) | — | Browser-side ML, 128D embeddings |
| Edge Functions | Supabase Functions (Deno) | — | Server-side logic, payment verification |
| Icons | Lucide React | — | SVG icon library |
| HTTP | Fetch API | Native | No axios dependency |

---

> **Last Updated:** 2026-04-11
> This document covers the complete WeddingQR codebase as explored from the `client/` and `admin/` folders.
