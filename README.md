# a date with me? 💕

A kawaii-themed interactive dating proposal site. Ask someone out with style — complete with a fleeing "No" button, activity picker, available time slots, RSVP storage, and confetti.

## Features

- **Kawaii Aesthetic** — Pink/purple My Melody & Kuromi inspired design, Fredoka font, rounded corners, soft shadows
- **Fleeing No Button** — GSAP-powered panicked escape with startle response, cubic flee curve, and idle return
- **Activity Picker** — Choose from park, bar, restaurant, or museum
- **Available Slots** — Owner sets available dates & times; users pick from free slots
- **Admin Dashboard** — Manage slots, view bookings
- **RSVP Backend** — PostgreSQL via Supabase
- **Confetti** — Celebratory burst on confirmation

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Svelte 5 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Animations | GSAP, canvas-confetti |
| Backend | Express 5 (dev) / Vercel Functions (prod) |
| Database | PostgreSQL via Supabase |
| Deployment | Vercel + Supabase |

## Setup

### 1. Supabase

Create a Supabase project and run the migration in `supabase/migrations/001_initial.sql` via the SQL editor.

### 2. Environment

Copy `.env.example` to `.env` and fill in your Supabase credentials and an admin password:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=service_role_key_here
ADMIN_SECRET=choose-a-secure-password
```

### 3. Development

```bash
npm install
npm run dev
```

Vite proxies `/api` requests to the Express server at `localhost:3001`. The Express server loads `.env` via dotenv automatically.

### 4. Admin

Visit `/admin` (click the tiny ✦ at the bottom of the ask page) and log in with your `ADMIN_SECRET`. Add available date/time slots from the dashboard.

## Deployment (Vercel + Supabase)

### Vercel

1. Push to GitHub
2. Import repo to Vercel
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Add env vars in Vercel dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `ADMIN_SECRET`
6. Deploy

The `vercel.json` handles SPA rewrites and asset caching.

## API

### `GET /api/available-slots`

Returns free slots grouped by date.

### `POST /api/booking`

Book a time slot.

```json
{
  "slot_id": "uuid",
  "name": "string",
  "activity": "park | bar | restaurant | museum"
}
```

### `POST /api/admin/verify`

Authenticate as admin.

```json
{
  "password": "string"
}
```

### `GET /api/admin/slots` (auth required)

View all slots with booking status.

### `POST /api/admin/slots` (auth required)

Create a new available slot.

```json
{
  "date": "YYYY-MM-DD",
  "time_start": "HH:mm",
  "time_end": "HH:mm"
}
```

### `GET /api/admin/bookings` (auth required)

View all bookings.

## Project Structure

```
├── api/                    # Vercel Functions (production backend)
│   ├── _supabase.js        # Shared Supabase client
│   ├── available-slots.js  # GET /api/available-slots
│   ├── booking.js          # POST /api/booking
│   └── admin/
│       ├── verify.js       # POST /api/admin/verify
│       ├── slots.js        # GET+POST /api/admin/slots
│       └── bookings.js     # GET /api/admin/bookings
├── server/
│   └── index.js            # Express dev server (local development)
├── src/
│   ├── App.svelte          # Main app (all pages + flee logic)
│   ├── Admin.svelte        # Admin dashboard component
│   ├── app.css             # Global styles (kawaii theme)
│   ├── main.ts             # Svelte mount point
│   └── lib/
│       └── types.ts        # Shared TypeScript types
├── supabase/migrations/    # Database schema
├── dist/                   # Built frontend assets
├── vercel.json             # Vercel deployment config
├── .env.example
├── Dockerfile
├── vite.config.ts
└── package.json
```
