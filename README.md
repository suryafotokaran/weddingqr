# Fotokaran Studio — WeddingQR

A full-featured photography studio management and portfolio platform for wedding photographers. Manage events, handle guest photo uploads, build custom wedding websites, track storage, and maintain a professional online presence — all in one place.

---

## What Is This?

Fotokaran Studio serves two types of users:

- **Studio Admin** — Photographers who manage events, upload/organize photos, build wedding websites, track client deliverables, and monitor storage usage.
- **Public Guests** — Event attendees who can upload photos via QR code, browse galleries, and submit reviews.

---

## Features

### Authentication
- Email/password sign-in and sign-up
- Forgot password with OTP verification
- Protected admin routes

### Event Management
- Create and manage events — weddings, engagements, birthdays, receptions, baby showers
- Track client details (names, contact, address, phone)
- Event metadata — date, location, shoot duration
- Delivery status tracking (Pending / Editing / Delivered)

### Photo Management
- **Guest Upload** — Secure uploads via unique event links or QR codes
- **Admin Upload** — Bulk drag-and-drop photo upload
- **Compression** — Automatic client-side compression with EXIF preservation
- **Formats Supported** — JPG, JPEG, PNG, WebP, BMP, SVG, AVIF, RAW
- **Signed URLs** — 1-hour expiring presigned URLs for secure photo access
- **Batch Operations** — Delete multiple photos at once
- **Face Detection** — AI-powered face detection for organizing photos

### QR Code System
- Generate shareable QR codes per event
- Guests scan QR to land on a upload page
- Dedicated QR view and upload pages

### Portfolio & Gallery
- Create multiple portfolios (weddings, engagements, etc.)
- Manage photos within each portfolio
- Category-based browsing
- Infinite scroll public gallery
- Control display ordering for portfolios and photos

### Website Builder (CMS)
- Build custom event-specific wedding websites
- Drag-and-drop template-based builder
- Website sections include:
  - Hero with wedding details (names, date, location)
  - Schedule / event timeline
  - Photo gallery
  - Client testimonials
  - Services display
  - Portfolio showcase
  - Floating CTA buttons
  - Google Maps integration
  - Instagram feed
  - About / Header / Footer customization
- Public wedding websites at `/w/:eventId`

### Review & Testimonial System
- Guests submit reviews with star ratings (1–5)
- Reviews can include up to 5 photos
- Testimonial gallery display on public site

### Package Management
- Create photography packages with pricing
- Define services, promised photos, video duration, album count
- Track pricing and discounts

### Storage Management
- Real-time storage usage dashboard
- Breakdown by category — Event Photos, Portfolio Photos, Site Gallery, Site Banners, Website Builder assets, Review Photos
- Cloudflare R2 (S3-compatible) as primary storage
- Configurable storage limits with visual indicators

### Public-Facing Site
- Landing page with hero, portfolios, and gallery
- Full gallery with infinite scroll
- Categories and dynamic portfolio pages
- Floating navigation buttons
- Instagram feed embed
- Testimonials showcase

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, React Router DOM 7 |
| Styling | Tailwind CSS 4 |
| State / Data | React Query (TanStack Query 5) |
| Icons | Lucide React |
| Database & Auth | Supabase (PostgreSQL + Auth) |
| Storage | Cloudflare R2 (S3-compatible) |
| Image Processing | browser-image-compression, exifr, libraw-wasm |
| AI / Face Detection | @vladmandic/face-api (TensorFlow.js) |
| QR Codes | qrcode.react |
| PDF Generation | @react-pdf/renderer |
| PSD Support | @webtoon/psd |

---

## Project Structure

```
WeddingQR/
├── client/
│   ├── src/
│   │   ├── App.jsx                  # Routing
│   │   ├── main.jsx                 # Entry point with providers
│   │   ├── pages/
│   │   │   ├── auth/                # SignIn, SignUp, ForgotPassword, OTP
│   │   │   ├── website/             # Website builder + public website
│   │   │   ├── Studio.jsx           # Admin dashboard
│   │   │   ├── Events.jsx           # Event list
│   │   │   ├── CreateEvent.jsx      # Create event
│   │   │   ├── EventLanding.jsx     # Event overview
│   │   │   ├── EventDetail.jsx      # Photo management
│   │   │   ├── EventManagement.jsx  # Client/delivery tracking table
│   │   │   ├── GuestUpload.jsx      # Guest photo upload
│   │   │   ├── QRUpload.jsx         # QR-based upload
│   │   │   ├── QRView.jsx           # QR landing
│   │   │   ├── SubmitReview.jsx     # Public review form
│   │   │   ├── WebsiteCMS.jsx       # CMS for website content
│   │   │   ├── R2Storage.jsx        # Storage management
│   │   │   └── Profile.jsx          # User profile
│   │   ├── photo/                   # Public portfolio site
│   │   │   ├── PhotoHomePage.jsx
│   │   │   ├── pages/               # FullGallery, Categories, Portfolio pages
│   │   │   └── components/          # Gallery, Portfolio, Testimonials, etc.
│   │   ├── components/              # Shared UI components
│   │   ├── context/                 # AuthContext
│   │   ├── hooks/                   # Custom hooks
│   │   └── lib/                     # supabase.js, s3.js, faceApi.js
│   ├── package.json
│   └── vite.config.js
├── site_schema.sql                  # Core DB tables
├── supabase_event_management.sql    # Event management table
├── supabase_packages.sql            # Packages table
└── website_cms.sql                  # Website CMS tables
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- A Supabase project
- A Cloudflare R2 bucket

### Environment Variables

Create `client/.env.local`:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_R2_BUCKET=your-r2-bucket-name
VITE_R2_ENDPOINT=your-r2-endpoint
VITE_R2_ACCESS_KEY_ID=your-r2-access-key
VITE_R2_SECRET_ACCESS_KEY=your-r2-secret-key
VITE_CF_API_TOKEN=your-cloudflare-api-token
```

### Database Setup

Run the SQL files in your Supabase SQL editor in this order:

1. `site_schema.sql`
2. `supabase_event_management.sql`
3. `supabase_packages.sql`
4. `website_cms.sql`

### Install & Run

```bash
cd client

# Install dependencies
npm install

# Start development server
npm run dev
# Runs at http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Key Routes

| Route | Description |
|---|---|
| `/` | Public portfolio home |
| `/gallery` | Full public gallery |
| `/categories` | Photo categories |
| `/signin` | Admin login |
| `/studio` | Admin dashboard |
| `/events` | Event list |
| `/events/:id` | Event details & photo management |
| `/events/:id/website` | Website builder |
| `/w/:eventId` | Public wedding website |
| `/upload/:eventId` | Guest upload page |
| `/qr/:eventId` | QR landing page |
| `/review/:eventId` | Guest review submission |
| `/storage` | R2 storage dashboard |
