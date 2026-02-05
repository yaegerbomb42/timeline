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

## Layout Structure

The app now displays three main vertical sections:

1. **Top - Entry Composer**
   - Add new timeline entries
   - Upload images with entries
   - Animated particle effects on submission

2. **Middle - Timeline AI**
   - Ask questions about your timeline
   - Get AI-powered insights and summaries

3. **Bottom - Timeline Rollercoaster**
   - Visual representation of your emotional journey
   - Mood-based vertical positioning
   - Interactive dots with hover details
   - Smooth animated curves connecting entries

## Admin Features

Admin mode provides additional capabilities:
- **Batch Import**: Upload timeline entries from .txt files
- **Bulk Delete**: Remove entries by time range (last 7/30 days or all)
- **Undo Batch**: Revert recent batch imports
- **Archive**: View recently deleted entries (last 30 retained)

See [ADMIN_ACCESS.md](ADMIN_ACCESS.md) for detailed instructions on accessing admin mode and using these features.

## Batch Import Format

Upload timeline entries from a .txt file with this format:

```
YYYY-MM-DD : Entry content here
Multiple lines are supported
~`~
2025-01-02 : Another entry
~`~
```

- Separator: `~`~` on its own line
- Date format: YYYY-MM-DD
- Content: Everything after ` : ` (space-colon-space)
- Multi-line entries are fully supported

## Mood Analysis System

All entries are automatically analyzed for sentiment:
- **Rating**: 1-100 scale (1 = most negative, 100 = most positive)
- **Description**: Sophisticated mood descriptions like "genuinely happy", "peaceful", "stressed out"
- **Emoji**: Visual mood indicator
- **Color**: Visual representation on timeline
  - Green: Positive mood
  - Pink: Negative mood
  - Cyan: Neutral mood

The Timeline Rollercoaster uses these ratings to position entries vertically, creating a visual representation of your emotional journey over time.
