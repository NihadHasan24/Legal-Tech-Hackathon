# Implementation status

Step 2 establishes the shared-record backend foundation. `NO` means the full requirement is not yet implemented, integrated, and testable through its intended journey. A foundation model or isolated API check alone does not qualify as `YES`.

Verified foundation: one Application-to-Case link; submission without a Case ID; authorised human acceptance; server-side role/office/assignment checks; append-only fact, consent, and safe-contact history; audit hash-chain checks; concurrent unique IDs. Citizen/provider journeys, contact disclosure, and document content handling are later steps.

Step 3 adds the non-AI workflow backbone: review and reasoned override, tasks with owner/next action, exact Application/Case ID search, document metadata versions, contact history, audit timeline, bounded shells for all eight provider roles, and one seeded fictional case. Browser proof (`npm run test:e2e`): a helpline-created application is reviewed and accepted by the DLAO through the same `applicationId`, and other roles cannot see it. Rows stay `NO` until their full persona/requirement journey lands in later steps.

Step 4 adds the deterministic (no-AI) `Call 16699 – Voice Access Prototype` page at `/voice`. It covers the simulation disclosure, a microphone-permission shell, separate live-voice/audio/transcript consent choices (placeholder wording), self vs representative, representation pending, identity incomplete, a safe-contact profile, read-back with correction, a minimal-data human callback (voice refused, person requested, or immediate danger), one Application ID with a DLAO review task, and an audited, integrity-checkable history. Contact logging now fails safe when an unknown person answers: neutral wording only, nothing disclosed, a safer follow-up task. Browser proof: Ripon finishes a representative intake with keyboard and accessible names only; all facts stay `REPRESENTATIVE_REPORTED` with applicant confirmation pending; the DLAO queue shows the one record; stored-audio refusal does not stop service; live-voice refusal reaches the callback route. A1/A2/B3 stay `NO` until live Bangla voice (Step 5) and Moyuri's own confirmation journey exist.

Step 5 adds the Gemini Live integration (the user switched the provider from OpenAI on 2026-09-22; see Goal.md Section 2). The server mints single-use ephemeral tokens with the prompt, tools, and modalities locked. The browser streams 16 kHz audio and plays 24 kHz audio with barge-in. The model can only call `record_answer`, `request_human_callback`, and `submit_confirmed_intake`; each call is validated client-side against the same script, and the final payload is validated again by the server. Answers the model extracted are flagged `aiInferred`; the audit records AI assistance, model, and confirmation method, with no model reasoning. A transcript is stored only with transcript consent; raw audio is never accepted. Any failure falls back to the keyboard route with answers kept. Verified: tool-boundary unit tests, server tests, and a browser fallback test. **Not yet verified: a real live conversation.** Google refuses every generation call for project 651567335823 ("Your project has been denied access"); `npm run check:live --workspace server` must pass once access is restored.

| Requirement | Implemented | Integrated | Testable | Planned evidence |
| --- | --- | --- | --- | --- |
| A1 Moyuri | NO | NO | NO | Safe representative intake, contact, confirmation |
| A2 Ripon | NO | NO | NO | Nonvisual independent task |
| A3 Nabila | NO | NO | NO | Restricted evidence and tracked referral |
| A4 Nuching | NO | NO | NO | Assisted, translated, offline intake |
| A5 Malek | NO | NO | NO | Status and lawyer follow-up |
| B1 DLAO officer | NO | NO | NO | Queue, review, override |
| B2 Mediator | NO | NO | NO | Mediation workflow |
| B3 Helpline role | NO | NO | NO | Shared lookup and intake |
| B4 UDC operator | NO | NO | NO | Bounded assisted access |
| B5 Panel lawyer | NO | NO | NO | Assignment and updates |
| B6 Receiving DLAO | NO | NO | NO | Acknowledged referral |
| B7 Case support | NO | NO | NO | Shared search and reporting |
| T1 Lawyer accountability | NO | NO | NO | Change, hold review, payment state |
| T2 Jurisdiction ping-pong | NO | NO | NO | Return and escalation |
| T3 Related incidents | NO | NO | NO | Linked independent cases |
| T4 Duplicate review | NO | NO | NO | Suggested candidates, human review |
| T5 Bangla intake agent | NO | NO | NO | Controlled conversation |
| T6 Document agent | NO | NO | NO | Sources, missing/unreadable items |
| T7 Settlement draft | NO | NO | NO | Human-reviewed draft |
| T8 Multi-agent triage | NO | NO | NO | Reasons and disagreement |
| T9 Offline sync | NO | NO | NO | Idempotency and conflict review |
| T10 Low-bandwidth PWA | NO | NO | NO | Installable app and light mode |
| T11 E-signature | NO | NO | NO | Async signing and integrity check |
| G1 One record | NO | NO | NO | Cross-channel continuity |
| G2 Provenance | NO | NO | NO | Source and confirmation history |
| G3 Safe contact | NO | NO | NO | Blocked unsafe disclosure |
| G4 Accessibility | NO | NO | NO | Nonvisual journey |
| G5 Human control | NO | NO | NO | Authorised final decisions |
| G6 Document control | NO | NO | NO | Version and uncertainty history |
| G7 Tracked responsibility | NO | NO | NO | Owner, deadline, escalation |
| G8 Resilience | NO | NO | NO | Retry and conflict handling |
| G9 Role-based privacy | NO | NO | NO | Server-side restricted reads |
| G10 Audit | NO | NO | NO | Reconstructable event history |
