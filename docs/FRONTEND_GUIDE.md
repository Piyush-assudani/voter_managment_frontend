# VijaySetu Frontend Architecture & Offline Mobile Guide

This frontend (`Next.js 16` App Router + React 19 + TypeScript) is built for spotty field networks, low-memory Android WebViews, and notch/keyboard-safe mobile layouts.

## Key Modules
- **`src/lib/api.ts`:** Centralized `apiFetch`, automatic JWT & `X-Client-Timezone` header injection, `Idempotency-Key` mutation deduplication, and `resilientMutate()` offline outbox integration.
- **`src/lib/offlineSync.ts`:** IndexedDB database (`vijaysetu_offline_db`) storing slim cached voter subsets (capped at `2000` records for 1GB–2GB RAM phones) and background sync queue with exponential backoff + `APP_SCHEMA_VERSION` upgrade safety.
- **`src/components/AppResilienceProvider.tsx`:** Listens to `online`, `visibilitychange`, `pageshow`, and `window.visualViewport` resize/scroll events to reconnect seamlessly after app minimization, flush queued booth votes, and keep focused inputs visible above virtual keyboards.
- **`src/lib/dateUtils.ts`:** Localized date/time rendering pinned cleanly to the client's IANA timezone (default `Asia/Kolkata`).
- **`src/app/global-error.tsx` & Error Boundaries:** Prevents full-screen whiteouts on unexpected runtime errors and offers 1-tap safe recovery without clearing saved offline booth votes.

See `../backend/docs/` (if present in monorepo checkout) for full PRD, TRD, RBAC database design, and Hindi+English User Manual.

