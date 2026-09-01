# Phase 11 classroom catalog automation

Date: 2026-09-01

## Product correction

The first staging shortlist proved that private ingestion, deterministic ingredient
screening, bounded queueing, reviewer authorization, promotion safeguards, and audit
records work. It also exposed the wrong operating model: broad USDA category balancing
queued pantry ingredients, food-service items, and products that a parent would not
realistically bring to a classroom. The owner is not expected to manually review this
pilot queue or a future catalog containing thousands of foods.

## `classroom-use-v2`

The replacement policy separates three questions that must not be conflated:

1. **Is this useful for a classroom?** Deterministic relevance scoring considers an
   allowlisted snack/treat/drink/lunchbox category, portable-product signals, individual
   package signals, generic identities, preparation items, bulk/food-service signals,
   discontinued status, and source quality flags.
2. **Do the supplied ingredients pass the Arizona rules?** The existing deterministic
   compliance package remains the sole rules engine. AI cannot override it.
3. **Is the formulation evidence current and trustworthy?** Manufacturer or package
   evidence is still required. USDA is a discovery lead, not independent verification.

Every private source record receives a 0–100 score, `HIGH` / `MEDIUM` / `LOW` /
`EXCLUDED` tier, explicit reason codes, and one route:

- `AUTO_EVIDENCE`: collect and compare independent evidence automatically;
- `HUMAN_EXCEPTION`: ambiguous ingredients or source-quality problems only;
- `DEPRIORITIZED`: irrelevant, failed, discontinued, bulk, or low-value records.

This slice does not auto-publish a product. It creates the safe routing layer needed for
automated evidence acquisition and later high-confidence promotion. Human work is limited
to exceptions and sampled quality control.

## Real staging dry run

The read-only `classroom-use-v2` dry run assessed all 489 current staging source records:

- 56 high, 51 medium, 49 low, and 333 excluded;
- 95 routed to automated evidence collection;
- 6 routed to human exception review; and
- 388 deprioritized.

Of the original 190-row pilot queue, 94 are useful enough for automated evidence
collection and 96 are deprioritized. The admin catalog defaults to the automatic-evidence
route, with human exceptions and deprioritized records available as explicit filters.

The deterministic assessment hash is
`147fbdefedf5ff5a34ad2991bc8271f0ce1c0ac524ce1afc5daafbc42c1bba6c`.
No staging row was changed by the dry run. Examples at the top of the automatic-evidence
route are snack bars, chips, crackers, popcorn, and other portable snack products. Honey
is now excluded because its category is not classroom-focused.

## Operational safeguards

Migration `0032_classroom_relevance_automation.sql` stores assessments and provides a
service-role-only, bounded function. Applying assessments requires:

- no more than 1,000 unique existing candidates;
- exact `classroom-use-v2` metadata and a SHA-256 selection hash;
- database validation of score/tier/route consistency;
- exact staging confirmation `APPLY_CLASSROOM_RELEVANCE_TO_STAGING`; and
- both configured staging project references matching the target URL in the operations
  script.

Every assessment writes an audit record. Automated evidence routing is rejected unless
the source record is current, has a clean deterministic `PASS`, has no quality flags, and
is high or medium relevance. Assessment cannot create, promote, or publish a product.

## Next slice

The next slice should acquire current package/manufacturer evidence for the 87
`AUTO_EVIDENCE` candidates, use AI only to extract and compare ingredient text, and send
source conflicts or uncertain ingredient mappings to `HUMAN_EXCEPTION`. A later guarded
promotion worker may auto-create public products only after evidence quality, formulation
identity, deterministic compliance, freshness, cost, and audit requirements all pass.
