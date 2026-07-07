# a date with me? 💕

A kawaii-themed multi-tenant booking platform where anyone can create a personal booking page, set available slots, and share their link. Each page features a **fleeing "No" button**, per-slot activity picker, and confetti celebration on confirmed bookings.

## Features

- **Multi-tenant** — Every user gets their own `yourdomain.com/u/username` page with password-based editing
- **Fleeing No Button** — GSAP-powered panicked escape on each `/u/username` page
- **Activity Picker** — Slot owner presets an activity (park/bar/restaurant/museum/custom) or lets the booker choose
- **Available Slots** — Owner sets available dates & times; bookers pick from free slots
- **Pending / Accept / Deny Flow** — Inquiries arrive as pending; creator accepts (slot booked, confirmation email) or denies (slot freed, optional reason)
- **Email Notifications** — Creator gets notified of new inquiries; bookers get confirmation/denial emails via Mailjet
- **Things I Like 💖** — Customizable bio shown on the ask screen
- **Password-based Editing** — No OAuth/email auth; SHA-256 password with optional passphrase generator
- **Inline Creation** — Create your page directly on the landing page with GSAP animation
- **Confetti** — Celebratory burst on confirmed booking

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Svelte 5 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Animations | GSAP, canvas-confetti |
| Backend | Express 5 (dev) / Vercel Functions (prod) |
| Database | PostgreSQL via Supabase |
| Email | Mailjet (200 emails/day free) |
| Deployment | Vercel + Supabase |

## Setup

### 1. Supabase

Create a Supabase project and run the migrations in `supabase/migrations/` in order via the SQL editor.

### 2. Environment

Copy `.env.example` to `.env` and fill in the values:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service_role_key_here
MJ_APIKEY_PUBLIC=your_mailjet_public_key
MJ_APIKEY_PRIVATE=your_mailjet_private_key
MAILJET_FROM_EMAIL=verified-sender@email.com
MAILJET_FROM_NAME=Date Slot
```

### 3. Development

```bash
npm install
npm run dev
```

Vite proxies `/api` requests to the Express server at `localhost:3001`. The Express server loads `.env` via dotenv automatically.

## Deployment (Vercel + Supabase)

1. Push to GitHub
2. Import repo to Vercel
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Add all env vars from `.env.example` in Vercel dashboard
6. Deploy

The `vercel.json` handles API routing and SPA rewrites.

## API

### `POST /api/create-profile`

Create a new profile.

```json
{
  "username": "string (lowercase, numbers, hyphens)",
  "display_name": "string",
  "email": "string",
  "password": "string (SHA-256 hashed client-side)"
}
```

### `POST /api/verify-profile`

Log in to manage a profile.

```json
{
  "username": "string",
  "password": "string (SHA-256 hashed)"
}
```

Returns profile data including `email`.

### `GET /api/public-profile?username=...`

Returns public profile data — display name, likes, and available slots (excluding those with pending/confirmed inquiries).

### `GET /api/available-slots?username=...`

Returns free slots grouped by date.

### `POST /api/booking`

Create a pending booking inquiry.

```json
{
  "slot_id": "uuid",
  "name": "string",
  "email": "string",
  "activity": "park | bar | restaurant | museum | (optional)"
}
```

### `POST /api/confirm-booking`

Accept a pending inquiry (requires auth).

```json
{
  "rsvp_id": "uuid",
  "username": "string",
  "password": "string (SHA-256)"
}
```

### `POST /api/deny-booking`

Deny a pending inquiry (requires auth).

```json
{
  "rsvp_id": "uuid",
  "username": "string",
  "password": "string (SHA-256)",
  "deny_reason": "string (optional)"
}
```

### `GET /api/manage-slots?username=...` (auth required)

Returns all slots for a profile with their booking status and inquiry details.

### `POST /api/manage-slots` (auth required)

Create a new available slot.

```json
{
  "username": "string",
  "password": "string",
  "date": "YYYY-MM-DD",
  "time": "HH:mm",
  "activity": "park | bar | restaurant | museum | custom"
}
```

### `DELETE /api/manage-slots` (auth required)

```json
{
  "username": "string",
  "password": "string",
  "slot_id": "uuid"
}
```

### `POST /api/update-likes`

Update the "Things I like 💖" bio.

```json
{
  "username": "string",
  "password": "string",
  "likes": "string"
}
```

## Project Structure

```
├── api/                    # Vercel Functions (production backend)
│   ├── _email.js           # Mailjet sender helper
│   ├── _supabase.js        # Shared Supabase client
│   ├── available-slots.js
│   ├── booking.js          # POST — creates pending inquiry
│   ├── confirm-booking.js  # POST — accepts inquiry
│   ├── create-profile.js
│   ├── deny-booking.js     # POST — denies inquiry
│   ├── manage-slots.js     # CRUD for slots
│   ├── public-profile.js
│   ├── update-likes.js
│   ├── verify-profile.js
│   └── admin/              # Legacy admin endpoints
├── server/
│   └── index.js            # Express dev server
├── src/
│   ├── App.svelte          # Main app (routing, home page, flee logic)
│   ├── CreateProfile.svelte
│   ├── ProfileEditor.svelte # Password-gated manage page
│   ├── PublicBookingPage.svelte # Dating proposal + booking flow
│   ├── app.css             # Tailwind v4 + kawaii theme
│   ├── main.ts
│   └── lib/
│       └── types.ts        # Shared types
├── supabase/migrations/    # Database schema (run in order)
├── dist/                   # Built frontend
├── vercel.json
├── .env.example
└── package.json
```
