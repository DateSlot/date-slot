# a date with me? 💕

A kawaii-themed interactive dating proposal site. Ask someone out with style — complete with a fleeing "No" button, activity picker, date/time selection, RSVP storage, and confetti.

## Features

- **Kawaii Aesthetic** — Pink/purple My Melody & Kuromi inspired design, Fredoka font, rounded corners, soft shadows
- **Fleeing No Button** — GSAP-powered panicked escape with startle response, cubic flee curve, and idle return
- **Activity Picker** — Choose from park, bar, restaurant, or museum
- **Date & Time Picker** — Select a date and time range
- **RSVP Backend** — SQLite-powered storage via Node's built-in `node:sqlite`
- **Confetti** — Celebratory burst on confirmation

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Svelte 5 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Animations | GSAP, canvas-confetti |
| Backend | Express 5 |
| Database | SQLite (`node:sqlite`, Node 22.5+) |
| Container | Docker |
| Reverse Proxy | Traefik |

## Development

```bash
# Install dependencies
npm install

# Start dev mode (Vite + server with hot reload)
npm run dev
```

Vite proxies `/api` requests to the Express server at `localhost:3001`.

## Production

```bash
# Build frontend
npm run build

# Start production server
NODE_ENV=production npm start
```

The server serves the built frontend from `dist/` and handles API routes.

## Docker

```bash
docker build -t date-me-page .
docker run -p 3001:3001 -v date-me-data:/app/data date-me-page
```

### Docker Compose

```yaml
date-me-page:
  container_name: date-me-page
  build:
    context: .
    dockerfile: Dockerfile
  restart: unless-stopped
  volumes:
    - date-me-data:/app/data
  labels:
    - traefik.enable=true
    - traefik.http.routers.date-me-page.rule=Host(`date.example.com`)
    - traefik.http.routers.date-me-page.entrypoints=websecure
    - traefik.http.routers.date-me-page.tls=true
    - traefik.http.routers.date-me-page.tls.certresolver=le
    - traefik.http.services.date-me-page.loadbalancer.server.port=3001
    - traefik.http.routers.date-me-page-web.rule=Host(`date.example.com`)
    - traefik.http.routers.date-me-page-web.entrypoints=web
    - traefik.http.middlewares.date-me-page-redirect-web-secure.redirectscheme.scheme=https
    - traefik.http.routers.date-me-page-web.middlewares=date-me-page-redirect-web-secure
```

## API

### `POST /api/rsvp`

Create an RSVP entry.

```json
{
  "name": "string",
  "activity": "park | bar | restaurant | museum",
  "date": "YYYY-MM-DD",
  "time_start": "HH:mm",
  "time_end": "HH:mm"
}
```

## Project Structure

```
├── server/
│   └── index.js          # Express 5 backend
├── src/
│   ├── App.svelte        # Main app (all pages + logic)
│   ├── app.css           # Global styles (kawaii theme)
│   └── main.ts           # Svelte mount point
├── data/                 # SQLite database (gitignored)
├── dist/                 # Built frontend assets
├── Dockerfile
├── vite.config.ts
└── package.json
```
