# FAME — ENSAM Meknès

Responsive React + TypeScript + Vite frontend for the FAME recruitment queue. The candidate ticket is the actual responsive page/PWA UI: there is no phone-device frame or prototype screen navigator.

## Run locally

Requirements: Node.js 20.19+ and npm.

```bash
npm install
npm run dev
```

Open the Vite URL printed in the terminal.

## Demo accounts

The current login form uses local mock authentication. It accepts exactly these credentials:

| Role | SchoolApp email | Password |
|---|---|---|
| Student | `salma.elamrani@edu.umi.ac.ma` | `fame2025` |
| Organizer | `organisateur@edu.umi.ac.ma` | `organisateur2025` |

Student credentials route to `#/student`. Organizer credentials route to `#/organizer`. The organizer panel opens the separate public display at `#/public` in a new tab. These credentials are for local UI testing only and are not real SchoolApp accounts.

## Screens and routes

- `#/login` — SchoolApp email/password login.
- `#/student` — live queue ticket and PWA installation card.
- `#/organizer` — filière queues, FIFO/manual attribution, undo, and public-screen launcher.
- `#/public` — public call display.

Protected student and organizer routes require a matching demo session in local storage. The public display is intentionally public.

## PWA

The project includes `public/manifest.webmanifest`, icons, and a service worker registered in `src/main.tsx`. In supported browsers the student page captures the native `beforeinstallprompt` event. In browsers that do not expose that event (including iOS Safari), the Install button shows the manual Add to Home Screen instructions. Web Push delivery is not connected yet.

For installability testing, serve the app from `localhost` or an HTTPS origin.

## Build

```bash
npm run typecheck
npm run build
npm run preview
```

## Integration status

This is a frontend demo. Replace the local mock login in `src/pages/LoginPage.tsx` with the signed SchoolApp assertion flow, and replace the sample queue data in `src/pages/OrganizerPage.tsx` and `src/pages/StudentPage.tsx` with the FastAPI API/WebSocket integration before production.
