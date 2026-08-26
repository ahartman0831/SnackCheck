# Incident response

## Severity

- **SEV1:** Wrong public PASS/FAIL, leaked secrets, or production extraction spend runaway
- **SEV2:** Provider/model outage, search unavailable, admin lockout
- **SEV3:** Stale cache, non-blocking analytics failure

## Immediate actions

1. Prefer VERIFY over an uncertain PASS. Disable extraction with the kill switch or by unsetting `OPENAI_API_KEY` if needed.
2. Disable Open Food Facts with `OPEN_FOOD_FACTS_ENABLED=false` if provider data is poisoning results.
3. Unpublish or roll back a ruleset only by publishing a new version; do not edit a published snapshot.
4. Record the incident, request IDs, ruleset hash, and engine version.

## Contacts

Owner assignments are recorded during Phase 10.
