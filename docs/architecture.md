# Architecture

Step 2 backend: Express route -> authentication/validation -> controller -> domain service -> Mongoose models. React is still a Step 1 home/health view; provider screens and ordinary workflow come in Step 3.

`Application` is the authoritative intake record. A unique Application ID is allocated at submission. Only the owning-office DLAO officer's acceptance service creates a linked `Case` and Case ID. Related facts, consent, representation, safe-contact versions, tasks, contact attempts, documents, and audit events link by Application ID; later workflows must continue to use this graph, not copy it into persona-specific cases. Atomic counters and unique indexes protect IDs under concurrent intake. Multi-record writes use MongoDB transactions.

Audit events are append-oriented in application code, sequenced per application, and SHA-256 chained for an integrity check. This detects ordinary changes to stored events in the demo; it is **not tamper-proof** against an actor who can rewrite the database and recompute the chain. No external hash anchor or independent custody exists yet. Fact corrections and safe-contact/consent changes append records rather than overwrite history.

The configured development database is the dedicated `dlas_hackathon_dev` database on MongoDB Atlas; local MongoDB remains supported via `server/.env.example`. The Atlas URI is only in ignored `server/.env`. Tests use a random, separately named `dlas_step2_test_*` database and remove only that database after checking its name. The seed script stores generated fictional-account passwords in ignored `server/.demo-credentials.json`.

External integration status: real 16699 telecom, government identity, SMS/USSD, and payment integrations are not connected. The planned web 16699 route must be labelled as a simulation. OpenAI integration begins only at approved Step 5.
