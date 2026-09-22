# DLAS prototype

Local MERN prototype of [Project.md](Project.md) through Step 5: the shared-record API, provider workspaces, and a `Call 16699 – Voice Access Prototype` page at `/voice`. The page offers live Bangla voice (Gemini Live API) or a keyboard route with no AI. It is a clearly labelled simulation, not the live 16699 service. Do not use real beneficiary data.

## Local start

Requires Node.js 22.13+ (22.x), 24.x, or 26+ and MongoDB. This workspace is configured for a dedicated MongoDB Atlas development database in ignored `server/.env`; alternatively, copy [server/.env.example](server/.env.example) to `server/.env` and run local MongoDB with Docker Desktop. Never commit or share the environment file.

```powershell
npm install
npm run seed --workspace server
npm run dev:server
```

In another terminal:

```powershell
npm run dev:client
```

Open `http://127.0.0.1:5173`. The API health endpoint is `http://127.0.0.1:5000/health`; it succeeds only when MongoDB responds. `npm run seed --workspace server` creates eight fictional provider accounts and keeps their generated passwords in ignored `server/.demo-credentials.json`; do not publish that file. For local Docker MongoDB, run `docker compose up -d` before seeding; the example configuration also uses port 5000.

Run the checks (API and browser tests each use a temporary, isolated MongoDB database that is dropped afterwards):

```powershell
npm run lint
npm test
npm run build
npx playwright install chromium  # first time only
npm run test:e2e
```

Live voice needs `GEMINI_API_KEY` and `GEMINI_LIVE_MODEL` in ignored `server/.env` (see [server/.env.example](server/.env.example)). Without them, or with `VOICE_AI=off`, the voice button falls back to the keyboard route. The browser only ever receives a single-use ephemeral token whose prompt and tools are locked by the server. `npm run check:live --workspace server` makes one real Bangla turn against the Live API; browser tests never call the paid API.

The root npm workspace installs both applications. Run `docker compose down` to stop the database without deleting its named volume.

## Structure

- `client/`: React views in JavaScript/JSX, built with Vite. Its home screen checks the local API.
- `server/src/routes/`: Express endpoint mapping.
- `server/src/controllers/`: HTTP response coordination.
- `server/src/services/`: domain rules and database coordination.
- `server/src/models/`: Mongoose schemas for the shared record and later workflows.
- `server/src/middleware/`, `validators/`, `utils/`, `seeds/`: authentication, input checks, ID generation, and fictional account seeding.
- `docs/`: architecture, permissions, legal-review, failure, and demonstration notes.

All later channels and roles must use the same authoritative Application/Case record. An Application ID is created on submission; a Case ID follows only authorised human acceptance. See [docs/permissions.md](docs/permissions.md) for the current API access matrix and [Goal.md](Goal.md) for the approved implementation order. Steps 1–4 need no credential. Step 5 uses `GEMINI_API_KEY`: by user decision, Gemini replaced OpenAI (see [Goal.md](Goal.md) Section 2).
