# Catalog evidence AI pilot 001

Run date: 2026-09-08

Environment: owner-designated non-production Supabase project
`lhnbxjvqllohlbtdncyg`. Production was not touched.

## Manufacturer evidence

Migration `0034` was applied directly to staging after green CI. Independent read-back
confirmed that all four AI-ledger tables had row-level security enabled, the kill switch
was `true`, the daily limit was `5`, and the ledger was empty.

A five-page dry run and persisted run collected bounded HTML snapshots from official Blue
Diamond, PepsiCo SmartLabel, Sargento, Simple Mills, and Mariani pages. All five requests
returned `EVIDENCE_FOUND`; none were blocked, missing, or failed. The later live AI retry
showed that this outcome was too permissive: the generic visible-text extractor had stored
navigation, disclaimers, and other page copy as if it were an ingredient statement. These
records are retained as immutable audit evidence but must not support promotion.

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
invalid OpenAI API key. No sixth comparison was attempted. The error was fail-closed:
every candidate remained private and routed away from automatic continuation. No product,
formulation, approval, or publication was created.

## Budget-control correction

Migration `0035` was applied to staging on 2026-09-08 after local application validation.
It retains the five-product run boundary, permits 15 billable-or-uncertain calls per
rolling hour and 50 per UTC day, and separately tracks definite non-billable releases.
Authentication failure closes the switch and stops the runner after the first rejected
item. A release is allowed only after an immutable attempt proves that the provider
returned no request ID, tokens, or cost.

The original five failures predated the specific authentication failure code. After the
invalid credential was independently verified, a one-time staging transaction released
those five reservations without modifying or deleting their attempt records. The action
was recorded once in the admin audit log. Staging now reports five historical claims,
five non-billable releases, and zero effective daily usage; the kill switch remains
`true`.

## Successful protected-preview retry

The existing OpenAI secret was validated and attached only to the protected Phase 11
Vercel preview. A private admin runner now requires an active staging administrator,
explicitly selected candidate IDs, an acknowledgement, the Vercel `preview` environment,
and two matching staging-project references. It rejects production execution, accepts no
more than five candidates, and cannot approve, promote, or publish a product.

The owner first ran Simple Mills alone, inspected the result, and then ran the remaining
four candidates. Both runs completed without provider, schema, timeout, or budget errors.

- One-product run: `86e1857b-deda-4ba1-bdcc-5fd2e2f52413`
- Four-product run: `2992e395-5496-44d7-9cc6-2672830252ff`
- Model / prompt: `gpt-5.6-luna` / `catalog-evidence-compare-v1`
- Planned / attempted: 5 / 5
- Provider failures: 0
- Automatic continuations: 0
- Human exceptions: 5
- Input / output / reasoning tokens: 4,650 / 1,365 / 1,015
- Estimated combined cost: `$0.002568000`
- Final kill switch: `true`

The results were appropriately cautious. Simple Mills and Sargento contained recognizable
ingredient sections surrounded by unrelated page text. The Blue Diamond and PepsiCo
SmartLabel HTML did not contain a usable ingredient statement, and the Mariani snapshot
was dominated by store/navigation content. Missing source GTIN/brand fields also prevented
identity confidence. Every record therefore remained private and routed to
`HUMAN_EXCEPTION`.

The prompt was not loosened. Instead, the manufacturer parser now evaluates every labeled
ingredient section, ignores “5 Ingredients or Less” navigation, trims allergen/footer
boundaries, rejects SmartLabel disclaimers and implausibly long page copy, and returns
`null` when static ingredient evidence is not actually present. The AI runner applies the
same plausibility check to previously stored evidence, so the five noisy immutable records
cannot be reused for another paid comparison. Read-only validation against the same live
pages extracted clean Sargento, Simple Mills, and Mariani ingredient statements and
correctly returned no ingredient statement for the two dynamic SmartLabel pages.

The next evidence run must use clean first-party ingredient pages for Blue Diamond and
Gatorade (or separately preserved package evidence), recollect the three statically
extractable pages, and preserve identity and ingredient sources as separate evidence when
one page cannot prove both. No additional paid comparison should occur until that cleaner
evidence run passes preflight.
