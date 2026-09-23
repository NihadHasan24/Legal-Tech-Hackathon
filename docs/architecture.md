# Architecture

## Application shape

The prototype is a React/Vite browser app with an Express 5 API and MongoDB via Mongoose. API requests flow through route-level authentication/role checks and validation, then controllers and domain services. The client uses same-origin `/api` requests by default (Vite proxies them during local development); `VITE_API_ORIGIN` points a separately hosted client at the API.

`Application` is the authoritative intake record. A unique Application ID is allocated at submission. Only a DLAO officer's authorised acceptance creates its linked `Case` and Case ID. Facts, consent, representation, safe-contact versions, tasks, contact attempts, documents, referrals, and audit events stay attached to that record graph rather than being copied into persona-specific cases. MongoDB transactions and unique indexes protect multi-record writes and IDs.

Access is enforced by the API using role, office, ownership, and assignment checks; hiding a client route is not an authorisation boundary. Restricted evidence requires a per-user grant or a permitted open referral. The SPA focuses the main landmark on navigation and uses accessible form labels, status/error semantics, and visible focus styles. Manual screen-reader verification is still outstanding.

## Data integrity and resilience

Application audit events are append-oriented, sequenced, and SHA-256 chained. The chain detects ordinary event changes but is not tamper-proof against a database administrator able to rewrite the events and recompute hashes; there is no external anchor or independent custody. Corrections and changes to contact/consent append history rather than overwrite it.

The PWA caches only its static shell. Encrypted IndexedDB drafts use mutation IDs for retry deduplication; stale server versions surface a conflict for a human decision. Browser-local encryption does not protect against a compromised device or a user who shares the passphrase.

In production, Express can serve the Vite `client/dist` build from the same origin as `/api`. Extensionless HTML routes fall back to the app shell, while `/api` and `/health` remain API-only. The shell/assets receive a separate CSP that permits same-origin scripts/styles/API calls, the service worker, and blob-backed audio playback; API responses keep the stricter API CSP and `no-store`. For the planned Vercel/Render split, Vercel serves the static shell and Render serves the API. Render allows cross-origin requests only from the exact `CLIENT_ORIGIN`; Vercel must separately configure static security headers, including a CSP with its Render API origin. Run `npm run check:production-static` to check the same-origin packaging locally.

## AI and external systems

Groq is an optional, server-side provider for voice transcription/field extraction and selected document, triage, and settlement assistance. Requests use task-specific allowlists; deterministic/manual paths remain available when the provider is absent or fails. AI suggestions cannot set consent, provenance, human confirmation, final priority, routing, eligibility, or legal outcome. Per-answer voice clips are processed in memory and discarded. Every call's full recording and transcript are stored under the greeting's recording notice (project decision 2026-09-23); the recording is capped at 8 MB, stored inline in MongoDB with its SHA-256 in the audit chain, and playable only by the owning-office DLAO officer. Bangla transcription accuracy has not been validated with a recorded caller sample; transcribing the 19 prompt clips produced recognisable but misspelled Bangla, which is why choices and phone numbers are keypad-only and never pass through the AI.

The web voice route is a simulation. Real 16699 telephony, government identity, SMS/USSD, payment, and notification integrations are not connected. Legal commencement and jurisdiction are not independently verified. No live government-service integration is claimed.

## Environments and deployment state

Local development uses the dedicated `dlas_hackathon_dev` MongoDB Atlas database configured only in ignored `server/.env`; `server/.env.example` lists variable names without credentials. Fictional demo-user credentials are generated in ignored `server/.demo-credentials.json`. The seed is repeatable. Automated database tests use separately named random test databases and refuse to drop a database outside that test-name pattern.

There is no public deployment yet. The API binds to loopback in development and to all interfaces in production by default (overridable with `HOST`), as hosting platforms require. Production staff sign-in remains disabled unless `STAFF_LOGIN_ENABLED=true` is set; the local quick-fill credential endpoint stays disabled in production. These are fictional seeded accounts, not a real staff identity system. A public deployment still needs HTTPS, host-managed secrets, a human-approved access model, and a health check against the connected database. TLS/HSTS must be supplied by the host or its trusted proxy. Login throttling is process-local and needs a shared limiter before horizontal scaling. Do not use real beneficiary data in this prototype.
