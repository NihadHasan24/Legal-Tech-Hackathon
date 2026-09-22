# Permissions — Steps 2–5 backend

Demo accounts authenticate with a 30-minute bearer session. Each request reloads active role assignments from MongoDB; browser-supplied roles are ignored. Demo login and session access are disabled in `NODE_ENV=production`. These are fictional accounts only, not a public identity system.

| Operation | Current server permission |
| --- | --- |
| Submit application | DLAO officer, case support, helpline agent, or UDC operator; assigned office becomes record owner |
| Read application status/IDs | Owning-office DLAO officer or case support |
| Accept application and create Case ID | Owning-office DLAO officer, with recorded reason |
| Record representation, facts/corrections, safe contact, consent | Owning-office DLAO officer; corrections and consent require an attestation |
| Read fact history and audit | Owning-office DLAO officer |
| Read case summary | Owning-office DLAO officer/case support, or actively assigned panel lawyer |
| Read standard document metadata | Owning-office DLAO officer/case support |
| Read restricted document metadata | Owning-office DLAO officer/case support **and** explicit user grant |
| Submit 16699 voice-simulation intake (`POST /api/voice/intakes`) | Public, no sign-in; strict field schema, 20 submissions per IP per 10 minutes, response is only the new Application ID. Provenance is set by the server, and writes are attributed to a disabled automated-channel account |
| Start live voice (`POST /api/voice/live-session`) | Public, no body accepted, shares the public rate limit. Returns a single-use Gemini ephemeral token (15 min, new session within 60 s) whose system prompt, tools, and modalities are locked on the server. The permanent key never leaves the server; returns 503 when live AI is off or refused |
| Read consented voice transcript | Owning-office DLAO officer; stored only when the caller granted transcript consent (server-enforced). Raw audio is never accepted or stored |
| Log contact attempt (including simulated unknown-person answer) | Owning-office DLAO officer; an unknown-person outcome returns neutral wording only and creates a safer follow-up task |

All other roles have no protected-record API permissions yet. UDC and helpline cannot reopen applications after submission. An unassigned lawyer cannot browse cases; no lawyer receives restricted evidence merely from assignment. `Document` currently stores metadata only, not uploaded content. The public voice intake can create a record but never read one: no citizen-facing status disclosure or caller-verification endpoint exists yet. Unknown contact safety means disclose nothing; storing a safe-contact profile does not itself authorise outbound contact.

Role and document denials are tested through direct HTTP calls. Routine denied reads are not yet audit-logged; Step 13 must review this with privacy and abuse-monitoring needs. Application audit history covers state changes, not every read.
