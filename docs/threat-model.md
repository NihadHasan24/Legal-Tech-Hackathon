# Threat model — pending Step 13 review

Step 2 runs on loopback with fictional data and protected case APIs. The development database is on Atlas. Demo bearer credentials are stored locally in ignored files; demo authentication is disabled in production mode. Do not expose this API publicly as-is. This is not a production security assessment.

The later threat-model review must cover shared and unsafe devices, stolen phones, untrusted callers, overreaching helpers, restricted evidence, weak connectivity, replayed sync mutations, stale edits, modified signed documents, prompt injection, and leaked browser tokens. For each, document the asset, attacker capability, prevention, detection, recovery, and residual risk. See `Project.md` and `Goal.md`; do not claim perfect security or tamper-proofing.
