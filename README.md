# Timeline

A time‑bound story, written one entry at a time — warm, quiet UI (no neon), with a horizontal “life line” and a newest‑first chat ledger.

## Features

- **Auth**: Firebase Auth (Google + email/password)
- **Persistence**: Firestore per-user storage
- **Timeline bar**: Horizontal day ticks with stacked marks, auto-fit + optional scroll, auto-scroll to newest, and a “badge earned” animation when you add an entry
- **AI (“Ask about your timeline”)**: One-call semantic summary/search over your timeline using a bounded context (monthly index + recent entries)

## Local dev

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Firebase setup checklist

- **Authentication**
  - Enable **Google** provider
  - Enable **Email/Password**
- **Firestore**
  - Create a Firestore database
  - Apply rules from `firestore.rules` (per-user silo)
- **Storage**
  - Enable Firebase Storage
  - Apply rules from `storage.rules` (per-user image storage)

Firebase web config is currently in `src/lib/firebase/client.ts`.

## AI key behavior (by design)

- The AI panel asks for a Gemini key **once per login identity** and stores it in `localStorage`.
- If requests start failing with auth errors, the key prompt reappears, but the app keeps working (AI is optional).

## Deploy (Vercel)

- Push this repo to GitHub (your remote: `https://github.com/yaegerbomb42/timeline`)
- Vercel will detect Next.js and deploy automatically (your project: `timeline4ever.vercel.app`)
