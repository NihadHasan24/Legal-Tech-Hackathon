# DLAS Agent Instructions: Skill-First Work

This file applies to Codex, Claude, Antigravity, and any other coding agent
working from this repository.

## Mandatory skill selection

Before changing code, configuration, tests, documentation, or design:

1. Read `Project.md` and `Goal.md` when the task could affect requirements or
   implementation order.
2. Inspect the project skills in `.agents/skills/`.
3. Select every skill that is directly relevant to the task; do not load skills
   that are unrelated or duplicate another selected skill.
4. Read each selected skill's `SKILL.md` completely before acting, and follow
   its instructions unless they conflict with the user's request or this file.
5. Briefly state which skills are being used and why before doing the work.

Never claim a skill was used unless its `SKILL.md` was read in the current task.
Do not install extra skills without the user's approval.

## Skill routing

| Task | Required project skill(s) |
| --- | --- |
| React components, routing, data fetching, or performance | `vercel-react-best-practices` |
| Citizen or provider UI | `minimalist-ui`, `web-design-guidelines` |
| Accessibility, keyboard, screen-reader, contrast, or mobile checks | `accessibility-review` |
| MERN setup or cross-stack work | `senior-fullstack` |
| MongoDB or Mongoose models, indexes, queries, or aggregation | `mongodb` |
| Authentication, authorization, sessions, JWT, or RBAC | `auth-implementation-patterns` |
| PWA, service worker, IndexedDB, offline cache, or sync | `pwa-development` |
| Vitest unit/integration tests | `vitest-testing` |
| Browser end-to-end tests | `playwright-testing` |
| OWASP/security review or server-side risk | `web-security-review` |
| OpenAI API integration | `openai-api-development` |
| Voice/Realtime agent work | `voice-agents`, `openai-api-development` |

Use more than one skill only when their responsibilities are genuinely
different. For example, an accessible React screen uses React, UI, and
accessibility skills; a simple MongoDB query uses only the MongoDB skill.

## DLAS non-negotiables

- Use plain JavaScript/JSX and the MERN MVC architecture. Do not introduce
  TypeScript.
- Build one authoritative Application/Case record; do not create disconnected
  persona applications.
- Respect the approved step order in `Goal.md`; obtain explicit approval before
  starting a new implementation step.
- Preserve safe contact, provenance, human authority, RBAC, audit history,
  accessibility, and privacy safeguards.
- AI may recommend or summarize but must not make final legal or consequential
  workflow decisions.

## Keep changes small and verifiable

Reuse existing code and installed dependencies before adding anything. For
non-trivial logic, add the smallest relevant runnable test or check. Report
what changed, what was verified, and any user decision still required.
