# Timeline AI Technical Notes

## AI Swarm Architecture

- **Waterfall Strategy**: To save quota, we attempt providers sequentially rather than racing them.
- **Multi-Key Cluster**: Currently detecting up to 20 keys per provider using `VITE_` and standard environment prefixes.
- **Provider Quotas**:
  - Gemini: 15 RPM (Free) / 1,500 RPD.
  - Groq: 30 RPM (Free) / 14,400 RPD.
  - Cerebras: 30 RPM (Free).
  - NVIDIA: Credit-based.

## Persistent State in Next.js

- The project uses `export const runtime = "nodejs"` in crucial API routes.
- Module-level variables (like `keyCounters`) persist as long as the Node process is alive. This is used for round-robin and will be used for the "Bucket" concurrency model.

## Mood Analysis Queue

- Frontend: `useMoodAnalysisQueue.ts` processes Firestore entries in batches of 15.
- A 5-second `RATE_LIMIT_DELAY` is enforced to stay under Gemini's 15 RPM limit safely.

## Pending Goals

- Refactor `swarm.ts` into a `SwarmEngine` that treats keys as individual work-buckets with locking and cooldown periods.
