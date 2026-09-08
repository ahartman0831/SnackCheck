# Catalog evidence AI pilot 001

Run date: 2026-09-08

Environment: owner-designated non-production Supabase project
`lhnbxjvqllohlbtdncyg`. Production was not touched.

## Manufacturer evidence

Migration `0034` was applied directly to staging after green CI. Independent read-back
confirmed that all four AI-ledger tables had row-level security enabled, the kill switch
was `true`, the daily limit was `5`, and the ledger was empty.

A five-page dry run and persisted run collected current ingredient evidence from official
Blue Diamond, PepsiCo SmartLabel, Sargento, Simple Mills, and Mariani pages. All five
requests returned `EVIDENCE_FOUND`; none were blocked, missing, or failed.

- Evidence run: `58f4a446-a57a-43a0-a0ea-4e818d9d68e1`
- Selection hash: `b73d32f672527c55a4204dd6da9d0c51dfc1d38cc333f6e07f074f9cb62f89ec`
- Saved manufacturer attempts: 5

## AI comparison attempt

The preflight found five completed manufacturer records, zero calls claimed for the UTC
day, an active verified `gpt-5.6-luna` rate card, a closed kill switch, and an unused run
ID. The staging switch was opened only around the bounded command and restored through an
automatic shutdown path.

- AI run: `60b112f6-3ec6-499a-84c8-de28432d087c`
- Planned / claimed / attempted: 5 / 5 / 5
- Model: `gpt-5.6-luna`
- Outcome: 5 provider errors; 0 continuations; 0 product decisions
- Provider-reported tokens: unavailable for all attempts
- Estimated cost: `$0.000000000`
- Central usage rows: 5
- Audit rows: 7 (run start, five attempts, run close)
- Final kill switch: `true`

A separate non-inference model-access check identified the local shell credential as an
invalid OpenAI API key. No sixth comparison was attempted and the daily counter was not
reset or bypassed. The error was fail-closed: every candidate remained private and routed
away from automatic continuation. No product, formulation, approval, or publication was
created.

## Required retry

Before a second pilot, replace the stale local OpenAI credential without printing or
committing it. Wait for the UTC daily counter to reset, confirm the kill switch is closed,
and use a new run ID. Do not exceed five new comparisons. The comparison layer now maps
authentication, invalid-request, and rate-limit responses to redacted failure codes so
future diagnosis does not require exposing provider details.
