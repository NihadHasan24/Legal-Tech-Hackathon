# PROJECT.md - Integrated Digital Legal Aid System (DLAS)

**Project:** ADLASB Grand Finale Case - "Five Doors, One Record"  
**Domain:** Digital legal aid in Bangladesh  
**Purpose of this file:** Canonical project context and anti-hallucination reference for every AI, developer, designer, law-team member, writer, and presenter working on this project.  
**Current phase:** Project definition is complete and implementation planning has begun. `Goal.md` defines the approved implementation sequence. The implementation stack is now fixed to MERN: MongoDB + Express.js + React.js + Node.js, using plain JavaScript/JSX (no TypeScript) and an MVC architecture. Detailed schema/API/vendor/deployment choices remain implementation matters unless explicitly locked later.  
**Last consolidated:** 22 September 2026

---

## 0. NON-NEGOTIABLE INSTRUCTIONS FOR ANY AI READING THIS FILE

1. Read this entire file before proposing architecture, code, UI, workflows, legal claims, or pitch content.
2. This project is **one integrated Digital Legal Aid System**, not 23 separate mini-projects.
3. The mandatory scope is exactly:
   - **5 citizen scenarios (A1-A5)**
   - **7 provider scenarios (B1-B7)**
   - **11 technical challenges (T1-T11)**
   - Total = **23 mandatory requirements**.
4. Every channel, provider, AI feature, document action, referral, mediation action, lawyer update, and offline action must connect back to the **same authoritative Application/Case record**.
5. Do not invent requirements, laws, government APIs, telecom access, external integrations, authority, data fields, or completed features.
6. Distinguish clearly between:
   - **Challenge requirement** - explicitly required by the case statement.
   - **Current project decision** - a design direction the team has chosen.
   - **Legal baseline verified from official law** - a proposition supported by current official legislation.
   - **Proposed safeguard** - a project idea that still needs legal/administrative confirmation.
   - **Pending verification** - a point the law team must confirm.
   - **Implementation TBD** - not yet decided and must not be guessed.
7. AI is an assistant, not the legal authority. It must not make final eligibility, rejection, final priority, legal-jurisdiction, consequential referral, final lawyer assignment, mediation outcome, or closure decisions.
8. Do not expose hidden chain-of-thought. Where explanation is required, show concise reasons, source/evidence, rule used, confidence/uncertainty, and the human-review state.
9. Do not use real NID numbers, real beneficiary data, real cases, live payments, or a live 16699 government call in the prototype. Use illustrative/sample data only.
10. Do not claim an external service is live when it is simulated. A simulator is acceptable only when clearly labelled and when the team's own state change, record update, task creation, and audit entry genuinely work.
11. Do not claim "tamper-proof." Use language such as **integrity-verifiable**, **integrity check**, or **tamper-evident under stated assumptions**.
12. Never auto-reject, auto-merge, or label a citizen fraudulent because of a duplicate/fraud-risk score.
13. Never treat representative-reported, intermediary-translated, staff-entered, or AI-inferred information as if the applicant personally confirmed it.
14. Do not silently overwrite history. Corrections must preserve who said what, what changed, who confirmed it, and when.
15. Do not mix unrelated projects, papers, research topics, trading work, or other attachments into this DLAS project unless the user explicitly says they belong here.
16. If this file conflicts with a later explicit user instruction, flag the conflict and use the later instruction only after updating the project source of truth.

---

# 1. THE CHALLENGE IN ONE SENTENCE

Build **one working, integrated Digital Legal Aid System** that allows very different citizens to enter through different access routes, allows seven provider roles to work on the same authoritative record, integrates eleven advanced technical capabilities, preserves safety/privacy/accessibility/provenance/audit, and **never replaces authorised human judgment**.

The core challenge question is:

> Can one digital legal-aid architecture serve five very different citizens, support seven different provider roles, and integrate eleven advanced technical challenges without fragmenting the case record or replacing human judgment?

The governing design principle is:

> **BUILD ONE SYSTEM - NOT TWENTY-THREE ISLANDS.**

---

# 2. OFFICIAL CHALLENGE IDENTITY AND DELIVERABLES

## 2.1 Challenge identity

- Grand Finale Case: **Five Doors, One Record**
- Theme: **Digital Legal Aid for the Future: Building Justice for Every Citizen**
- Project context: **Accelerating Digital Legal Aid Services in Bangladesh (ADLASB)**
- DLAS = Digital Legal Aid System
- DBLA = Directorate of Bangladesh Legal Aid
- DLAO = District Legal Aid Office / Officer depending on context
- UDC = Union Digital Centre

## 2.2 Deliverables and deadlines

1. **Solution paper**
   - Deadline: 26 September 2026, 11:59 PM
   - PDF
   - Maximum 2 pages / 1,000 words
   - Must cover architecture, integration map, coverage, what was built, human safeguards, resilience/failure model, and five success indicators.

2. **Final submission**
   - Deadline: 27 September 2026, 8:00 AM
   - Pitch deck + public prototype URL + QR code on slide 1
   - 90-second fallback recording

3. **Grand Finale**
   - 27 September 2026
   - 10-minute pitch + 10-minute jury Q&A

4. **Prototype standard**
   - Working integrated prototype.
   - Labelled simulation is acceptable only where an external integration cannot reasonably be connected live.
   - Concept-only slides/wireframes/verbal descriptions do not count as implementation.
   - A juror must be able to trigger the relevant action and observe the resulting state change.

---

# 3. ONE RECORD: THE CORE SERVICE MODEL

## 3.1 Common backbone

The system follows this service path:

`ENTRY CHANNEL -> APPLICATION ID -> VERIFICATION / REVIEW -> CASE ID -> MEDIATION / LAWYER / REFERRAL / OTHER SERVICE -> FOLLOW-UP -> OUTCOME -> CLOSURE`

## 3.2 Application ID vs Case ID

### Application ID
- Created when an application is submitted.
- Exists before final acceptance into the legal-aid case workflow.
- May contain incomplete identity, unconfirmed representative reports, pending documents, safe-contact rules, and verification tasks.

### Case ID
- Created **only after acceptance** into the legal-aid case workflow.
- Remains with the matter through referral, mediation, lawyer assignment, follow-up, outcome, and closure.

## 3.3 Information that must follow the same record

At minimum, the shared record must preserve the concepts below across handovers:

- Application ID and Case ID
- applicant identity/verification status
- representation status and scope
- source/provenance of each important statement
- safe-contact channel, number, time, and restrictions
- current status and next action
- responsible role/person
- documents and document version history
- missing/uncertain/unreadable document state
- sensitive-evidence restrictions
- tasks, deadlines, reminders, and ageing
- referral history and acknowledgement state
- mediation history
- lawyer assignment/update history
- hearing/update dates
- citizen corrections/withdrawals
- human overrides and reasons
- AI suggestions/inferences clearly marked as such
- access/change audit history
- offline/sync/conflict history where applicable

## 3.4 Channel rule

A channel is only an **interface into the same service**. It must not become a separate case-management system.

A person can start through one door and continue through another without re-entering the story into a disconnected record.

---

# 4. FOUR LAYERS THE SYSTEM MUST SATISFY

## Layer 1 - Citizen Access
Question: Can every required citizen reach or remain connected to legal aid despite disability, low literacy, unsafe devices, weak connectivity, language limitations, or unstable contact?

## Layer 2 - Service Delivery
Question: Can each required provider role see the right information, know the right next action, and hand the matter onward without creating parallel records or unnecessary administrative burden?

## Layer 3 - Technical Capability
Question: Can the same system handle all eleven required advanced case-management, AI, and resilience challenges?

## Layer 4 - Governance and Trust
Question: Can every consequential action be explained, corrected, controlled, restricted, and traced?

Cross-cutting governance requirements include:
- safety
- privacy
- accessibility
- provenance
- human authority
- audit
- failure handling
- role-based access
- document control
- resilience

---

# 5. FIVE DOORS INTO THE SAME RECORD

## Door 1 - 16699 / IVR / Voice
For people who can speak or use a keypad but may not be able to read.

Required service properties:
- voice-first intake/status
- confirmation/read-back
- safe-contact handling
- representation handling
- human handoff
- nonvisual accessibility

**Current project decision:** because the team does not have access to the real 16699 telecom infrastructure, the prototype will provide a clearly labelled **web-based 16699 Voice Access simulation**. See Section 7.

## Door 2 - USSD / SMS or Equivalent Low-Data Route
For basic phones and weak/no data situations.

Required principles:
- short flows
- minimal data dependency
- neutral/privacy-aware messages
- no sensitive detail in unsafe messages

The exact technical implementation of USSD/SMS is **TBD**. Do not claim a real telecom integration unless one is actually built.

## Door 3 - Web / Mobile
For independent digital users.

Required principles:
- Bangla-first
- accessible
- low-bandwidth
- save/resume
- PWA/light mode as required by T10

## Door 4 - Assisted Access
For UDC users, authorised helpers, or representatives.

Required principles:
- consent
- provenance
- bounded permissions
- assistance status
- free-service notice
- safe/applicant contact where available
- audit trail

## Door 5 - DLAO / Referral Route
For walk-ins and institutional handovers.

Required principles:
- same record
- no re-entry of the same story
- structured handover
- acknowledgement
- responsibility/deadline tracking

---

# 6. MANDATORY PART A - FIVE CITIZEN SCENARIOS

All five are mandatory. They are not alternatives.

---

## A1. MOYURI AKTER - JOYPURHAT

### Given situation

- Her husband controls the smartphone.
- Her button phone is checked.
- Her NID is inaccessible.
- Her brother Ripon has contacted legal aid / the 16699 route.
- The office has not yet heard Moyuri's own account.

### Problems that must be solved

- unsafe contact
- incomplete identity
- representation / third-party initiation
- secondhand information
- applicant confirmation
- ability to correct or withdraw previously reported information

### Required evidence

- Application can progress safely even when identity information is initially incomplete.
- Ripon's account is visibly different from Moyuri's own confirmation.
- Safe channel/number/time and neutral wording are enforced.
- Moyuri can later confirm, correct, or withdraw information.
- Failure test: an unsafe or unknown person answers the phone/contact attempt.

### Current project solution for Moyuri

1. **Ripon enters through the voice-access route.**
   - Ripon must be able to use the route nonvisually because he is blind.
   - The first step establishes whether he is speaking for himself or someone else.

2. **The system records the speaker correctly.**
   - Speaker: Ripon.
   - Relationship: brother.
   - Applicant: Moyuri.
   - Representation/authority status: visible and not assumed.
   - Until legally verified, treat him as the source of a third-party/representative report, not as proof that Moyuri authorised every action.

3. **Ripon gives the initial account.**
   - Important facts are labelled `REPRESENTATIVE_REPORTED`.
   - `APPLICANT_CONFIRMED = NO/PENDING`.
   - The system must never rewrite this as "Moyuri said..." unless Moyuri actually confirms it.

4. **Incomplete identity does not silently become verified identity.**
   - Moyuri's NID is unavailable.
   - The initial intake may be opened with available information if permitted by applicable process.
   - Missing identity evidence remains visibly incomplete.
   - Any later legal step requiring identity proof must wait for the required verification.
   - Exact minimum identity rules remain a law-team/process verification item.

5. **Safe Contact Profile is mandatory.**
   Capture only what is necessary, including as applicable:
   - safe channel
   - safe phone/contact
   - safe time window
   - whether SMS is safe
   - whether neutral wording is required
   - unsafe/prohibited channels
   - special instruction if another person answers

6. **DLAO receives a review task.**
   The officer must immediately see:
   - report source = Ripon
   - Moyuri confirmation = pending
   - identity = incomplete where applicable
   - safe-contact restrictions = active
   - next required action

7. **Moyuri is contacted only through the recorded safe method.**
   - If Moyuri is safely reached, she can give her own account.
   - She can confirm, correct, qualify, or withdraw information previously reported by Ripon.
   - Her own statement becomes separately identifiable as applicant-supplied/applicant-confirmed information.

8. **History is preserved.**
   - Ripon's original report remains in the audit/provenance history.
   - Moyuri's later correction does not silently delete the fact that another version was previously reported.
   - The authoritative current field may change while the historical source remains traceable.

9. **Human authority remains final.**
   - AI/voice intake does not determine eligibility.
   - AI does not make the final safety decision.
   - Authorised human staff decide the legal next step.

### Moyuri failure test - unsafe person answers

If an unknown or unsafe person answers:
- do not reveal that Moyuri sought legal aid
- do not state the complaint category
- do not disclose case/application details
- do not reveal sensitive facts
- use only legally approved neutral wording, if any
- log the contact attempt and reason for non-disclosure
- keep safer follow-up pending

### Moyuri law-team verification questions

- When may Ripon initiate contact/application before Moyuri personally confirms it?
- What exact legal/procedural status should Ripon's report have before confirmation?
- What is the minimum identity information needed to begin intake?
- At what stage is NID or other identity proof mandatory?
- What constitutes valid authority/consent for Ripon to act as representative?
- What may Ripon receive before and after Moyuri confirms representation?
- What wording is lawful/safe when an unverified person answers?
- How should Moyuri's correction/withdrawal affect current fields while preserving audit history?
- What separate consent/authority is required for recording Ripon's voice and later Moyuri's voice?

---

## A2. RIPON - BLIND REPRESENTATIVE

### Given situation

Ripon can use calls/voice but cannot independently use visual forms, PDFs, CAPTCHA, or visual OTP.

### Must solve

- blind/nonvisual access
- authentication
- representation authority
- nonvisual status access

### Required evidence

- Ripon completes at least one meaningful Bangla task without a sighted helper.
- The scope/status of his authority is visible.
- The record clearly distinguishes what Moyuri has and has not confirmed.

### Current project direction

- Voice-first path is the preferred accessible route.
- No essential step may depend only on a visual CAPTCHA, visual PDF, or visual OTP.
- Equivalent accessible authentication/status methods must exist.
- Voice interaction must not increase his authority beyond what is actually verified.

---

## A3. NABILA - JHENAIDAH

### Given situation

A former classmate is using fake/altered images and pressuring her. Harm is spreading, and some response may require another competent authority.

### Must solve

- urgency
- highly sensitive evidence
- role-restricted access
- referral

### Required evidence

- Urgency is surfaced for human review.
- Sensitive material is access-restricted.
- Referral contains reason, relevant history, documents, responsible actor, expected action, acknowledgement, deadline, and escalation.
- Failure test: receiving authority does not acknowledge.

### Current project direction

- AI/rules may surface an urgency recommendation with reasons.
- Authorised human reviews final priority.
- Sensitive evidence is not visible to every role.
- Referral is tracked end to end.
- Non-acknowledgement produces a follow-up/escalation task, not silent success.

---

## A4. NUCHING MARMA - KHAGRACHARI

### Given situation

- Cannot read.
- Speaks Marma and limited Bangla.
- A UDC entrepreneur types/photographs documents.
- The UDC worker may use his own number.
- Connectivity is unreliable.

### Must solve

- assisted access
- language/translation provenance
- consent
- document quality
- offline resilience

### Required evidence

- Distinguish Nuching's original statement from translated/typed content.
- Record who assisted and what was consented to.
- UDC access is bounded.
- Document problems are visible.
- Work survives network loss.
- Failure test: network drops halfway through submission.

### Current project direction

- Record original speaker, helper/translator, typist, and confirmation status separately.
- Show free-service notice.
- Do not make the UDC worker's phone the permanent applicant contact by default.
- Offline-created work receives a temporary identifier and later synchronises without duplicate submission.
- Conflicting edits go to human review.

---

## A5. ABDUL MALEK - BARGUNA

### Given situation

- Case is seven months old.
- Hearing dates were learned informally.
- Number on file belongs to a shop.
- Travel costs wages.
- Panel-lawyer updates are missing.

### Must solve

- long-running case
- unstable contact
- low literacy
- status access
- lawyer accountability

### Required evidence

- Malek obtains permitted status/next step without needing a smartphone or reading.
- Failed contact attempts are logged.
- Overdue lawyer updates surface before unnecessary travel.
- Failure test: panel lawyer misses two mandatory updates.

### Current project direction

- Nonvisual/voice or equivalent accessible status route.
- Track hearing/update dates and next action.
- Missed update thresholds create reminders, case-protection tasks, and review alerts.
- Lawyer change/reassignment remains a human decision.

---

# 7. CURRENT 16699 VOICE ACCESS SOLUTION

This is a **current project decision**, not a claim of live government integration.

## 7.1 What is being simulated

The team does not have access to the real 16699 telecom/IVR infrastructure.

Therefore the website will include a clearly labelled button such as:

**"Call 16699 - Voice Access Prototype / Simulation"**

The external telecom connection is simulated. The following internal functions are intended to be real and testable:

- microphone-based voice conversation
- Bangla voice interaction
- caller/self-vs-representative distinction
- approved intake questions
- adaptive clarification within guardrails
- consent state
- provenance capture
- safe-contact capture
- transcript/structured intake where lawful
- caller read-back/confirmation
- human handoff
- Application ID creation
- DLAO queue/task creation
- audit entry
- same shared DLAS record

## 7.2 Intended user experience

1. User presses the 16699 Voice Access button.
2. The service clearly states that it is the project prototype/simulation and not the live government phone connection.
3. The service explains the relevant data/recording choice in simple Bangla.
4. The user chooses/expresses consent where required.
5. The assistant asks one simple question at a time.
6. The user can explain the problem naturally.
7. The assistant asks only approved clarifying questions.
8. Important facts are stored with their actual source and confirmation status.
9. Safe contact is collected where relevant.
10. If the situation is sensitive/ambiguous/unsafe, the assistant stops unnecessary questioning and creates a human-review/handoff task.
11. Before submission, the service reads back a concise summary.
12. The caller may correct it.
13. An Application ID is created.
14. The matter appears in the same DLAO record/work queue.

## 7.3 Voice assistant behaviour rules

The voice assistant must:
- speak simple natural Bangla
- ask one question at a time
- avoid legal jargon where possible
- distinguish applicant from representative
- never invent missing facts
- mark unavailable information as unavailable
- preserve provenance
- ask about safe contact where relevant
- avoid unnecessary sensitive questions
- hand ambiguous/sensitive cases to a human with context
- read back a summary before final submission
- allow correction
- never decide eligibility
- never reject the person
- never make final legal/jurisdiction/priority decisions
- never present AI-generated text as the applicant's exact words

## 7.4 Minimum intake fields/concepts for the voice route

Subject to law-team review and data-minimisation rules:

- consent state / lawful processing basis
- caller is self or speaking for another person
- caller name, where necessary
- applicant name, where necessary
- caller relationship/authority status if speaking for another person
- complaint/problem statement
- district/location relevant to routing
- safe-contact method
- safe-contact number/owner where necessary
- safe time
- whether SMS is safe
- immediate safety/urgency indicator for human review
- applicant confirmation status

## 7.5 Recording, transcript, and consent - current refined position

Do **not** hard-code the false assumption that refusing stored audio automatically means the citizen cannot use voice support.

The project must distinguish at least conceptually between:

1. **Using live voice processing to conduct the interaction**
2. **Persistently storing the audio recording**
3. **Persistently storing a transcript or structured facts**

Current refined design:

- Full conversation recording is supported **only when the applicable legal basis/consent permits it**.
- If the person refuses stored audio, the system should not automatically deny service.
- If legally permitted, the voice interaction may continue without retaining the raw audio, while only necessary confirmed information is kept.
- If the person refuses the voice-processing route itself, or the route cannot safely continue, provide a **Minimal-Data Intake / Human Callback** alternative, for example keypad/text/assisted human follow-up.
- Do not call this route "anonymous" if a phone number, contact, or other identifying information is collected.
- The fallback should collect only what is necessary for safe follow-up, such as safe contact, safe time, district, and urgency/request type, subject to legal confirmation.

**Pending law-team verification:** exact consent/lawful-basis requirements for live processing, recording, transcription, retention, and deletion.

## 7.6 Voice provenance rule

The record should conceptually separate:

- **Who supplied the fact** - applicant / representative / intermediary / staff
- **How it was captured** - voice / typed / translated / document / AI extraction
- **Who confirmed it** - caller / applicant / officer
- **Applicant confirmation status** - especially when a representative spoke

Example for Moyuri:

- Source person: Ripon
- Source type: representative-reported
- Capture method: voice AI assisted intake
- Caller confirmed summary: yes/no
- Moyuri confirmed: pending/no until she personally confirms

## 7.7 What is not decided yet

> **Decided 2026-09-22 (user instruction):** voice AI vendor/API = Google Gemini Live API (Gemini Developer API), model `gemini-3.8-live`. The browser connects with short-lived ephemeral tokens; the permanent key stays server-side. The remaining items below are still undecided.

Do not assume any of the following until `Goal.md` or a later explicit decision:

- exact voice-AI vendor/API
- Gemini, OpenAI, Groq, Twilio, or any other provider
- exact free-tier availability
- exact transcription vendor
- exact TTS vendor
- exact browser audio architecture
- exact recording format/storage service
- real telephone integration
- real 16699 API
- real government authentication

---

# 8. MANDATORY PART B - SEVEN PROVIDER SCENARIOS

## B1. DLAO Officer

### Problem
No unified view of new, incomplete, urgent, pending, or overdue matters; staff must check files/registers/calls/messages separately.

### Required outcome
- unified operational view
- new/pending/overdue/priority matters
- reasons for flags
- searchable history
- reminders/ageing
- officer can override recommendation
- override is recorded

### Guardrail
Final prioritisation remains with the officer.

---

## B2. Legal Aid Officer / Mediator

### Required workflow
`registration -> scheduling/notices -> documents -> attendance -> mediation -> outcome`

Must also demonstrate:
- remote/hybrid option where legally/practically appropriate
- clear in-person fallback
- settlement drafting support under T7
- asynchronous e-sign/integrity under T11

### Guardrail
Mediation outcome and legal validity remain human/legal matters.

---

## B3. 16699 Helpline Agent / Voice-Access Role

### Required outcome
- find an existing Application/Case ID
- show permitted current status/next step
- create new assisted Bangla intake
- write into the same record, not a separate note system

### Current prototype interpretation
The real telecom service is not integrated. The web-based voice-access simulator represents the channel. A role-appropriate agent/voice workflow must still update the same authoritative record.

### Guardrail
Do not disclose more than the caller is authorised to receive.

---

## B4. UDC Entrepreneur

### Required outcome
- assisted intake mode
- case-type checklist
- free-service notice
- provenance and consent
- safe/applicant contact where available
- limited post-submission access
- weak-network/offline support

### Guardrail
Do not make the UDC operator the continuing unrestricted owner of the applicant's data.

---

## B5. Panel Lawyer

### Required outcome
- assignment/worklist
- relevant case documents
- hearing dates
- deadlines
- required updates
- digital accept/decline
- progress report
- overdue reminder
- safe client notifications linked to the case

### Guardrail
Pattern alert does not establish misconduct.

---

## B6. Referral Receiving DLAO

### Required outcome
- complete digital referral package
- reason/history/documents
- responsible actor
- expected action
- acknowledgement
- accept/return with reason
- status visible to sending and receiving offices
- non-acknowledgement follow-up/escalation

### Guardrail
Final legal jurisdiction remains a human decision.

---

## B7. DLAO Administrative / Case-Support Staff

### Required outcome
- structured digital case record
- search
- version history
- task status
- reportable fields captured once and reused
- routine reporting without repeated manual re-entry

### Guardrail
Role-based privacy still applies, especially to sensitive evidence.

---

# 9. MANDATORY PART C - ELEVEN TECHNICAL CHALLENGES

All eleven must be **implemented, integrated, reachable, and testable**. They are stress tests of one architecture, not standalone products.

---

## T1. Lawyer Change / Repeated Inactivity / Payment Reconciliation

### Challenge requirement
Citizen lawyer-change request -> DLAO queue -> human review/reassignment -> stage-based payment reconciliation -> separate repeated-inactivity review alert.

### Acceptance requirement
Show:
- change request
- officer review
- reassignment
- payment-status update
- separate pattern alert at the defined threshold

### Non-negotiable guardrail
Pattern detection may trigger review; it does not itself establish misconduct or a recoverable amount.

### Current proposed refinement - Temporary New-Assignment Hold

If a panel lawyer misses **two consecutive mandatory updates**:

1. create overdue alerts and an urgent case-protection review for affected active cases;
2. place the lawyer on an **Automatic Temporary New-Assignment Hold Pending Human Review**;
3. do not assign new cases to that lawyer while the hold is active;
4. do **not** cancel existing cases automatically;
5. do **not** declare professional misconduct automatically;
6. do **not** impose automatic financial penalty or payment recovery;
7. do **not** remove the lawyer from the panel automatically;
8. route the matter to the legally authorised panel-management reviewer/body;
9. human authority decides whether to lift/continue the hold, seek explanation, reassign affected clients, reconcile payment status, or take further action under applicable rules.

**Important legal-status note:** the exact authority for this temporary hold/review (for example CLAO and/or the relevant committee under applicable rules/orders) must be confirmed by the law team. Do not present the project's chosen demo reviewer as a proven statutory authority unless verified.

---

## T2. Jurisdiction Ping-Pong

### Requirement
Detect repeated transfer/return -> show acknowledgement/return reason -> escalate -> authorised human makes final routing decision.

### Acceptance test
After two rejected/returned transfers, show escalation and human decision.

### Guardrail
System escalates. It does not make the legal jurisdiction decision.

---

## T3. Multiple Applicants / One Incident

### Requirement
- separate cases remain separate
- link them into a related-incident group
- upload common evidence once
- group-level view
- preserve case-specific records

### Acceptance test
Create three linked cases and one shared/common document visible across the group.

### Guardrail
**Link, do not merge.** Confidentiality, instructions, and outcomes remain case-specific.

---

## T4. Duplicate / Fraud-Risk Detection

### Requirement
- fuzzy/similarity matching using multiple attributes
- confidence/evidence display
- side-by-side human review

### Acceptance test
Use 10-15 demo records with genuine duplicate candidates plus at least two similar-but-different trap cases.

### Guardrail
Never auto-reject, auto-merge, or label a person fraudulent.

---

## T5. Conversational Bangla Intake Agent

### Requirement
- natural Bangla multi-turn intake
- fill only approved fields
- ask clarifying questions
- use only approved rules/tools
- preserve provenance
- human handoff for sensitive/ambiguous cases

### Acceptance test
- one straightforward intake
- one sensitive/ambiguous case handed to a human with context

### Guardrail
AI may explain/check published rules but does not decide eligibility. Extracted facts remain traceable and confirmable.

### Current anchor
The web-based 16699 Voice Access simulation is the primary demonstration anchor for T5, especially Moyuri/Ripon.

---

## T6. Document Summarisation and Checklist Agent

### Requirement
Analyse 5-6 sample documents and produce:
- concise briefing
- case-type checklist comparison
- missing items
- uncertain/unreadable items
- source references for each material summary point

### Acceptance test
Include:
- at least one deliberately missing item
- at least one unclear/unreadable item

### Guardrail
Do not guess unreadable content. Officer verifies the briefing.

---

## T7. Settlement Agreement Drafting Assistant

### Requirement
Turn mediator notes into a draft grounded in approved templates/examples.

Must:
- mark AI-filled/inferred sections
- flag inconsistencies
- require explicit human review
- demonstrate maintenance, property, and labour scenarios

### Guardrail
The output is a **draft**, not a final legal instrument merely because AI generated it.

### Current legal refinement
Electronic/technical signing alone does **not** create the legal effect of a court decree.

For the statutory mediation path under section 21G/21g of the Legal Aid Services Act as amended in 2026, where that provision has been brought into force for the relevant date/area:

1. parties sign;
2. mediator signs;
3. Chief Legal Aid Officer (CLAO) **certifies** the mediation agreement;
4. only then does the statute provide the final/binding/enforceable effect and decree/final-order treatment described in section 21G/21g.

The Directorate/database entry is important for administration, audit, integrity, and recordkeeping, but **do not claim database registration itself is the statutory act that creates decree status** unless a separate verified rule says so.

Also verify applicability because commencement of sections 21B/21G and the schedule is area/date dependent by Gazette notification.

---

## T8. Multi-Agent Case-Triage Pipeline

### Requirement
At least three specialised components/agents for:
- categorisation
- compliance/process checking
- orchestration/combining results

The system must show:
- structured reasons/evidence
- conflicts/disagreements
- human-review state

### Acceptance test
Run at least five sample cases, including one where components disagree.

### Guardrail
Explainability means concise reasons/evidence, not hidden chain-of-thought. Final priority/routing remains human-reviewable.

---

## T9. Offline-First, Integrity-Verifiable Sync

### Requirement
- create applications offline with temporary UUIDs/temporary IDs
- reconnect and synchronise without duplicates
- route conflicting edits to human review
- demonstrate integrity verification

### Acceptance test
- create three records offline
- reconnect/sync
- show no duplicates
- simulate one conflict
- run integrity verification

### Guardrail
State threat model and assumptions. Do not claim absolute tamper-proofing.

---

## T10. Low-Bandwidth Progressive Web App

### Requirement
- installable PWA
- safe offline caching
- adaptive/light mode
- testing under throttled network and constrained-device assumptions

### Acceptance test
Demonstrate normal and light mode under the same throttled profile and report simple load/interaction measures.

### Guardrail
Do not indiscriminately cache sensitive data on shared devices. Explain later how caching, encryption, exclusion, logout, and shared-device behaviour are handled.

---

## T11. Offline-Capable Secure E-Signature

### Requirement
- asynchronous signing linked to mediation record
- two parties may sign at different times
- one may sign offline then sync later
- cryptographic/integrity verification
- independent verification method

### Acceptance test
Two parties sign at different times, one offline; later sync; verify signatures and demonstrate that a changed document fails integrity verification.

### Guardrail
Cryptographic validity does not by itself establish legal validity, identity, capacity, informed consent, or enforceability.

### Current legal position for project purposes
- The ICT Act, 2006 provides the relevant legal framework for electronic records/signatures.
- Do not state that an electronic signature alone turns a mediation settlement into a decree.
- For the section 21G/21g mediation route, parties' signatures + mediator signature + CLAO certification are the statutory conditions identified in the 2026 amendment, subject to the provision being in force for the relevant area/date.

---

# 10. THE GOLDEN THREAD - G1 TO G10

These are cross-cutting behaviours, not ten new modules.

## G1. One Record, Many Doors/Providers
All channels and roles touch the same record. History shows source, role, and handover.

## G2. Representation and Provenance
Who spoke, typed, translated, inferred, confirmed, or changed information must be visible. Authority status must be visible.

## G3. Safe Contact
Unsafe contact can be blocked or delayed, with a recorded reason.

## G4. Accessibility and Inclusion
The relevant task must be usable through the required accessible/non-screen/assisted route.

## G5. Human Control
Consequential recommendations can be reviewed, corrected, or overridden. Human authority and override reason are recorded.

## G6. Complete File and Document Control
Missing, uncertain, unreadable, latest-version, and possible-duplicate issues are surfaced without silent merging or guessing.

## G7. Tracked Responsibility
Mediation, referral, lawyer, task, and deadline show owner, status, and next action.

## G8. Resilience
Weak network/offline/retry/conflict paths do not silently lose or duplicate records.

## G9. Role-Based Privacy
Each role sees what it needs and no more. Boundaries survive handovers.

## G10. End-to-End Audit
A juror can reconstruct who did what, when, through which channel/provider role, from what source, and under whose authority.

---

# 11. PROVENANCE MODEL - NON-NEGOTIABLE

Important information must not be stored as a bare fact without source context when source matters.

Use conceptual provenance labels such as:

- `APPLICANT_REPORTED`
- `APPLICANT_CONFIRMED`
- `REPRESENTATIVE_REPORTED`
- `INTERMEDIARY_TRANSLATED`
- `INTERMEDIARY_TYPED`
- `STAFF_ENTERED`
- `DOCUMENT_EXTRACTED`
- `AI_INFERRED`
- `UNKNOWN_OR_UNVERIFIED`

A useful conceptual record should answer:

- What is the value?
- Who supplied it?
- What role were they acting in?
- How was it captured?
- Was it translated/typed by someone else?
- Was it inferred by AI?
- Who confirmed it?
- Has the applicant personally confirmed it?
- When was it created/changed?
- What was the previous value/source?

**AI-inferred information must never silently replace source information.**

---

# 12. HUMAN AUTHORITY - WHAT AUTOMATION MUST NOT FINALISE

The challenge explicitly protects human authority.

The following remain with authorised humans:

- legal-aid eligibility
- rejection
- final priority
- legal judgment
- consequential referral
- final jurisdiction/routing decision
- final lawyer assignment/reassignment
- final determination of lawyer misconduct/disciplinary action
- mediation outcome
- legal review of settlement
- CLAO certification where required by law
- final closure

Automation may:
- recommend
- flag
- explain
- compare
- summarise
- remind
- escalate
- detect conflict
- prepare drafts
- identify missing information
- create review tasks

But automation must not disguise these functions as final legal authority.

---

# 13. SAFE CONTACT AND PRIVACY MODEL

## 13.1 Safe contact

A safe-contact profile may include:
- allowed channel
- prohibited channel
- safe number/contact owner
- safe time window
- SMS allowed/not allowed
- neutral wording required
- no-voicemail instruction where appropriate
- what to do if an unknown person answers

Safe-contact rules must follow the record during handovers.

## 13.2 Sensitive evidence

Highly sensitive material, especially Nabila's altered/intimate images or similar evidence:
- must be role-restricted
- must not be shown to every user with case access
- should have access history
- should not be copied into unrelated notes
- should not be exposed in notifications
- should be included in referral only where necessary and authorised

## 13.3 Data minimisation

Collect only what is necessary for the stated purpose. Do not ask for or retain sensitive details merely because the AI can.

## 13.4 Voice data

Audio, transcript, and extracted facts are not interchangeable. Treat their consent/lawful-basis, retention, access, and deletion questions separately.

---

# 14. FAILURE-HANDLING RULE

Every module must fail **visibly and safely** through one or more of:

- uncertainty marker
- retry
- save/resume
- human handoff
- escalation
- conflict review
- non-disclosure
- blocked unsafe action
- pending state

Silent failure is unacceptable.

---

# 15. REQUIRED "BAD DAY" / FAILURE TESTS

At minimum, the prototype must be ready to show these:

1. **Moyuri - unsafe person answers**
   - No sensitive disclosure.
   - Neutral/safe behaviour.
   - Attempt logged.

2. **Ripon - no sighted helper**
   - Completes one meaningful task independently.

3. **Nabila - receiving authority does not acknowledge**
   - Referral becomes overdue.
   - Follow-up/escalation created.

4. **Nuching - network drops mid-submission**
   - Work survives.
   - Later syncs once.
   - No duplicate.

5. **Malek - lawyer misses two mandatory updates**
   - Overdue/pattern alert.
   - Current proposed temporary new-assignment hold.
   - Human review.
   - No automatic misconduct finding.

6. **Duplicate trap case**
   - Similar-but-different people remain separate unless human review decides otherwise.

7. **Triage disagreement**
   - Conflict shown to officer.

8. **Unreadable document**
   - Mark unreadable/uncertain.
   - Do not guess.

9. **Offline edit conflict**
   - Both versions visible.
   - Human resolution.

10. **Signed document changed later**
    - Integrity verification fails visibly.

---

# 16. SIX INTEGRATED DEMONSTRATION FLOWS

The 23 mandatory items should be demonstrated through a small number of connected flows rather than 23 isolated demos.

## Flow 1 - Safe and Accessible Voice Intake
Covers:
- Moyuri
- Ripon
- 16699 voice-access role
- T5 Conversational Bangla Intake
- representation
- provenance
- safe contact
- read-back/correction
- nonvisual accessibility
- human handoff

## Flow 2 - Assisted, Low-Bandwidth and Offline Intake
Covers:
- Nuching
- UDC entrepreneur
- case-support staff
- T6 Document Agent
- T9 Offline Sync
- T10 PWA
- translation/typing provenance
- consent

## Flow 3 - DLAO Daily Operations
Covers:
- DLAO officer
- case-support staff
- T3 Related Incident Cases
- T4 Duplicate Detection
- T8 Multi-Agent Triage
- daily queue/priority/follow-up

## Flow 4 - Mediation and Settlement
Covers:
- Legal Aid Officer/Mediator
- scheduling/notices/documents
- attendance
- remote/hybrid participation
- T7 Settlement Drafting
- T11 E-Signature
- human legal review
- CLAO certification where applicable

## Flow 5 - Urgent Referral and Receiving Office
Covers:
- Nabila
- DLAO officer
- receiving DLAO
- tracked referral
- sensitive access
- T2 jurisdiction escalation
- non-acknowledgement failure

## Flow 6 - Long-Running Case and Lawyer Accountability
Covers:
- Malek
- panel lawyer
- DLAO officer
- hearing/update reminders
- citizen status
- T1 lawyer-change/pattern alert/payment reconciliation
- proposed temporary new-assignment hold after threshold

---

# 17. COMPLETE 23-ITEM COVERAGE CHECKLIST

Each item must eventually be marked in three dimensions: **Implemented / Integrated / Testable**.

## Part A - Citizens

- [ ] **A1 Moyuri** - safe contact, identity gap, representation, applicant confirmation
- [ ] **A2 Ripon** - blind/nonvisual access and independent task/status
- [ ] **A3 Nabila** - urgency, sensitive access, tracked referral
- [ ] **A4 Nuching** - assisted access, language/provenance, offline
- [ ] **A5 Malek** - long-running status, unstable contact, lawyer follow-up

## Part B - Providers

- [ ] **B1 DLAO officer** - operational view, backlog, priority, follow-up
- [ ] **B2 Legal Aid Officer/Mediator** - end-to-end mediation + remote/hybrid
- [ ] **B3 16699 helpline/voice role** - shared lookup + Bangla intake/status
- [ ] **B4 UDC entrepreneur** - assisted intake + checklist + safe contact + free-service notice
- [ ] **B5 Panel lawyer** - assignment/worklist + hearing/deadline + updates
- [ ] **B6 Receiving DLAO** - complete referral + acknowledgement/status
- [ ] **B7 Administrative/case-support staff** - structured record + search + reporting continuity

## Part C - Technical

- [ ] **T1** Lawyer change + repeated inactivity + payment reconciliation
- [ ] **T2** Jurisdiction ping-pong + escalation
- [ ] **T3** Related incident cases + shared evidence
- [ ] **T4** Duplicate detection + human review
- [ ] **T5** Conversational Bangla intake agent
- [ ] **T6** Document summary/checklist agent
- [ ] **T7** Settlement drafting assistant
- [ ] **T8** Multi-agent triage pipeline
- [ ] **T9** Offline-first sync + conflict/integrity handling
- [ ] **T10** Low-bandwidth PWA
- [ ] **T11** Asynchronous secure e-signature

---

# 18. LEGAL BASELINE CURRENTLY VERIFIED FROM OFFICIAL BANGLADESH SOURCES

**Important:** This section is a working legal baseline, not a substitute for the law team's formal review. Laws, rules, orders, and Gazette commencement can change. Re-check before final submission if a legal proposition is material to the pitch.

## 18.1 Online/direct legal-aid application

The Legal Aid Services (Amendment) Act, 2026 (Act No. 45 of 2026) replaced section 16 so applications may be submitted directly or online to the relevant legal-aid offices under the Directorate.

Official source:
- https://bdlaws.minlaw.gov.bd/act-print-1674.html

## 18.2 Personal Data Protection Act, 2026

The Personal Data Protection Act, 2026 (Act No. 63 of 2026) is the current statute and repealed the 2025 ordinance and its 2026 amendment.

Relevant verified principles include:
- consent-based processing under section 5, subject to the Act;
- consent must be voluntary, specific, clear, and withdrawable, and the person must be informed about purpose, retention, transfer, and withdrawal process;
- the data controller bears the burden of proving proper consent;
- section 5 also recognises specified legal bases/legitimate interests where processing may occur without consent, subject to the statutory conditions, including establishing legal rights and protecting vital interests;
- sensitive personal data has additional conditions under section 7;
- data subjects have rights including correction/update and consent withdrawal/objection under the Act;
- retention and security obligations apply.

Official source:
- https://bdlaws.minlaw.gov.bd/act-print-1692.html

### Project consequence

Do not state as a legal fact that "if audio recording is refused, Voice AI must immediately shut down." The project instead separates:
- live voice processing,
- persistent audio recording,
- transcript/structured data retention,

and provides a minimal-data/human fallback when voice processing or recording cannot lawfully/safely continue.

Exact operational policy must be confirmed by the law team and applicable regulations.

## 18.3 Mediation agreement effect - section 21G/21g

The 2026 amendment states that a mediation agreement signed by the parties and mediator and **certified by the Chief Legal Aid Officer** is final, enforceable, and binding; the statute further provides decree/final-order treatment as stated in section 21G/21g.

Official source:
- https://bdlaws.minlaw.gov.bd/act-print-1674.html

### Important commencement limitation

The 2026 amendment provides that sections 21B/21G and the schedule come into force for the dates/areas specified by Government Gazette notification. Therefore the prototype must not blindly label every settlement nationwide as a decree without checking legal applicability.

### Project consequence

Use a state such as:

`DRAFT -> HUMAN REVIEW -> PARTY SIGNATURES -> MEDIATOR SIGNATURE -> PENDING CLAO CERTIFICATION -> CERTIFIED/FINAL (where legally applicable)`

Database registration is an audit/recordkeeping step; do not present it as the statutory act that independently creates decree status unless separately verified.

## 18.4 Electronic signatures

The Information and Communication Technology Act, 2006 contains the legal framework/definition relating to electronic signatures and electronic records.

Official source:
- https://bdlaws.minlaw.gov.bd/act-print-950.html

### Project consequence

Cryptographic/integrity verification is useful evidence of technical authenticity, but it does not by itself establish all legal requirements such as identity, capacity, informed consent, mediator/CLAO formalities, or enforceability.

## 18.5 Panel lawyer accountability and due process

The Legal Aid Services Act, 2000 as amended contains panel-lawyer governance and provides for review/action concerning complaints such as negligence with an opportunity for hearing before adverse findings/actions under the applicable committee process.

Official source:
- https://bdlaws.minlaw.gov.bd/act-print-834.html

### Project consequence

The T1 temporary new-assignment hold is a **proposed administrative safeguard**, not an automatic finding of misconduct. The exact authority/process for such a hold must be legally/administratively confirmed.

---

# 19. OPEN LEGAL / POLICY QUESTIONS THAT MUST NOT BE GUESSED

Law-team verification is required for at least the following:

1. Representative initiation: when can someone like Ripon initiate an application?
2. Representation authority: what proof/consent is required and what can a representative see/do?
3. Applicant confirmation: what must Moyuri personally confirm before formal processing?
4. Identity: what minimum information is sufficient at intake and when are documents mandatory?
5. Voice processing: what lawful basis/consent is needed for live AI processing?
6. Audio recording: what must be disclosed and what form of consent is sufficient?
7. Transcript retention: can transcript/summary be retained and for how long?
8. Withdrawal/correction: how should data be corrected/withdrawn while preserving lawful audit history?
9. Safe contact: what may be said to an unverified person and what neutral wording is approved?
10. Sensitive evidence: which roles may view highly sensitive images/documents?
11. Urgency: what facts justify an urgent flag and who has final authority?
12. Referral/jurisdiction: who may initiate, accept, return, escalate, and finally decide routing?
13. Remote/hybrid mediation: when is it legally/practically acceptable?
14. Settlement drafting: which templates/clauses and review steps are approved?
15. E-signature: what identity/capacity/consent/formality requirements apply to each settlement type?
16. Section 21G applicability: is the provision in force for the relevant location/date/matter?
17. Lawyer hold/change/payment: who has legal/administrative authority for temporary assignment hold, reassignment, and payment reconciliation?
18. Retention/deletion: how long may audio, transcripts, documents, evidence, and logs be retained?
19. Human handoff: what service-level deadline should apply to urgent/sensitive referrals?
20. Contact owner: how should a helper's/UDC operator's phone number be handled without making it the applicant's permanent contact?

---

# 20. PROPOSED SUCCESS INDICATORS

The solution paper requires five success indicators. Current proposed indicators are:

1. **Safe-contact compliance rate**
   - Percentage of contact attempts that follow the recorded safe-contact rules with zero unauthorised sensitive disclosure in test scenarios.

2. **One-record continuity rate**
   - Percentage of tested journeys where every channel/provider action remains linked to the same Application/Case record without duplicate parallel records.

3. **Accessible completion rate**
   - Percentage of required accessibility scenarios (for example Ripon nonvisual and Nuching assisted/low-literacy) that can complete the intended task without an excluded step.

4. **Tracked responsibility / overdue visibility**
   - Percentage of referrals, lawyer updates, mediation tasks, and deadlines with a visible owner, status, next action, and escalation when overdue.

5. **Resilient recovery rate**
   - Percentage of offline/network-failure/conflict tests recovered without silent data loss or duplicate creation, with conflicts surfaced for review.

These are project proposals and may be refined before the final solution paper.

---

# 21. JUDGING CRITERIA TO OPTIMISE FOR

- **System integration and architecture - 20%**
  - one coherent architecture
  - shared records/services
  - clear state transitions
  - no disconnected feature islands

- **Technical quality and reliability - 20%**
  - working implementation
  - data/state coherence
  - failure handling
  - source traceability
  - sound engineering

- **Practical service improvement / legal impact - 15%**
  - improves access/provider work without bypassing legal requirements

- **Innovation - 10%**
  - beyond reproducing paper forms/workflows

- **Inclusion and accessibility - 10%**
  - disability, low literacy, assisted access, weak devices, language/connectivity constraints

- **Privacy, safety and responsible AI - 10%**
  - safe contact
  - bounded access
  - provenance
  - human authority
  - explainability
  - audit

- **Feasibility, interoperability and scalability - 10%**
  - fits DLAS/provider operations and can scale beyond pilot

- **Presentation and multidisciplinary teamwork - 5%**
  - coherent legal/technical/design/governance reasoning

---

# 22. RECOMMENDED 10-MINUTE PITCH STRUCTURE FROM THE CHALLENGE

- **1 minute:** architecture - one system, four layers, 23 mandatory items
- **6 minutes:** integrated flows covering all citizens, providers, and technical modules
- **1 minute:** one planned "Bad Day" failure and recovery
- **1 minute:** provider workload reduction + citizen inclusion/safety payoff
- **1 minute:** feasibility, DLAS workflow fit, scaling, and metrics

The jury may inspect any mandatory item during Q&A, including items not narrated in the pitch.

---

# 23. PROJECT GLOSSARY

- **ADLASB** - Accelerating Digital Legal Aid Services in Bangladesh project
- **DBLA** - Directorate of Bangladesh Legal Aid
- **DLAS** - Digital Legal Aid System
- **DLAO** - District Legal Aid Office / Officer depending on context
- **CLAO** - Chief Legal Aid Officer
- **UDC** - Union Digital Centre
- **16699** - legal-aid helpline / IVR route as specified by the challenge; in this prototype the telecom layer is simulated unless actual access is later obtained
- **Application ID** - identifier created at application submission
- **Case ID** - identifier created only after acceptance into the legal-aid case workflow
- **Provenance** - who supplied, typed, translated, inferred, confirmed, or changed information
- **Safe Contact Profile** - allowed/prohibited contact channels/times/wording and related safety instructions
- **Golden Thread** - cross-cutting behaviours that must remain consistent across scenarios/modules
- **Human handoff** - transfer from automated/assisted interaction to an authorised person with context preserved
- **Integrity verification** - checking that the stored/signed content still matches the expected content; this is not a claim of absolute tamper-proofing

---

# 24. IMPLEMENTATION DECISIONS AND THINGS NOT YET DECIDED - DO NOT HALLUCINATE THEM

## 24.1 Decisions now locked

The following implementation decisions are established project facts and must not be replaced without the user's explicit approval:

- **Stack:** MERN only - MongoDB, Express.js, React.js, Node.js
- **Language:** plain JavaScript/JSX only; no TypeScript
- **Architecture:** MVC, with Mongoose Models, Express Controllers/Routes, React Views, and supporting Services/Middleware/Validators
- **Database engine:** MongoDB

`Goal.md` contains the detailed implementation contract and step order.

## 24.2 Still not decided

The following are intentionally deferred to `Goal.md` and later implementation planning:

- exact MongoDB schema/index details
- cloud/deployment provider
- authentication mechanism
- exact role-permission implementation
- exact voice-AI provider/API
- exact STT/TTS provider
- exact model names
- exact free API/service availability
- exact SMS/USSD provider
- real 16699 integration
- real government API integrations
- exact e-signature cryptographic library/provider
- exact offline storage/sync library
- exact PWA implementation
- exact AI-agent orchestration framework
- exact duplicate-matching algorithm
- exact triage model/rules
- exact document-OCR/model stack
- exact encryption/key-management design
- exact data retention periods
- exact production security architecture
- final UI design/branding
- final sample dataset
- final success-indicator thresholds

Any AI that needs one of these must either:
1. wait for `Goal.md` / later project decisions, or
2. explicitly label a suggestion as a proposal rather than an established project fact.

---

# 25. FINAL PROJECT TRUTH SUMMARY

If an AI remembers only one section, it must remember this:

1. We are building **one integrated Digital Legal Aid System**, not separate apps.
2. All **5 citizens + 7 provider roles + 11 technical challenges** are mandatory.
3. Every route and feature writes to or references the **same authoritative Application/Case record**.
4. **Application ID** is created at submission; **Case ID** only after acceptance.
5. Safe contact, representation, provenance, permissions, document history, tasks, and audit follow the record.
6. The **16699 telecom connection is not available**; our current solution is a clearly labelled **web-based 16699 Bangla Voice Access simulation** with a real internal intake workflow.
7. Voice AI asks controlled questions, records provenance, supports read-back/correction, creates the Application ID, and hands sensitive/ambiguous cases to humans.
8. Full audio recording is not assumed. Live voice processing, stored audio, transcript, and structured facts are legally distinct data-handling questions. Refusal must not automatically become denial of service; provide a lawful minimal-data/human fallback.
9. For **Moyuri**, Ripon's report must remain visibly representative-reported until Moyuri confirms it. Safe contact is central. If an unsafe person answers, disclose nothing sensitive.
10. **Ripon** must complete a meaningful task without sighted help.
11. **Nabila** requires urgency review, restricted evidence, and tracked referral with non-acknowledgement escalation.
12. **Nuching** requires assisted/translated provenance, consent, document-quality visibility, and offline recovery without duplicates.
13. **Malek** requires nonvisual status, contact-failure logging, lawyer-update accountability, and protection from unnecessary travel.
14. After two consecutive required lawyer updates are missed, the current proposed safeguard is a **temporary new-assignment hold pending human review**, not an automatic misconduct finding or punishment.
15. AI never decides final eligibility, rejection, priority, jurisdiction, lawyer reassignment, mediation outcome, or closure.
16. Duplicate detection is review support only: never auto-reject, merge, or call someone fraudulent.
17. Related incident cases are linked, never merged.
18. Offline sync must avoid duplicates, surface conflicts, and verify integrity.
19. E-signature integrity does not equal legal enforceability by itself.
20. For the 2026 statutory mediation route, parties + mediator sign and the **CLAO certifies** the agreement; section 21G/21g effect applies only where the provision is legally in force for the relevant area/date.
21. Database registration is recordkeeping/audit; do not falsely claim it alone creates court-decree status.
22. Every failure must be visible and safe through retry, uncertainty, handoff, escalation, conflict review, or blocked disclosure.
23. The jury must be able to reach and test all 23 mandatory items.

---

# 26. NEXT FILE TO CREATE LATER

The next planned file is **`Goal.md`**.

`Goal.md` will describe **how the team intends to implement this already-defined project**, including architecture choices, stack, modules, implementation order, API/service choices, database design, role permissions, demo data, test flows, and coding instructions.

Do **not** turn this `Project.md` into `Goal.md`. This file defines **what the project is, what is mandatory, what has already been decided, what legal safeguards apply, and what remains unresolved**.
