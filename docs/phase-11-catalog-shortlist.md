# Phase 11 category-balanced catalog shortlist

Date: 2026-08-31

## Purpose

Turn the 463 private USDA candidates that passed the initial ingredient screen
into a smaller, useful evidence-review queue. Shortlisting is triage only. It
does not verify a formulation, approve a product, publish a product, or make a
regulatory determination.

## Selection policy

The `school-use-v1` policy is deterministic and accepts only current
`SCREENED_PASS` / `PASS` candidates that are not discontinued and have no
quality flags. It uses an explicit allowlist of USDA categories grouped as:

- snacks;
- breakfast;
- lunchbox;
- drinks; and
- treats.

Exact category allowlisting intentionally excludes pantry and preparation
items such as sauces, seasonings, cake mix, frozen dough, juice concentrate,
coffee, alcohol, and energy/weight-control products. The selector balances
source categories, prefers records with package details and newer source
dates, and initially limits brand concentration. It relaxes the brand cap only
when needed to fill a group.

AI is not called and does not rank, queue, approve, or promote any candidate.

## Real staging dry run

The read-only dry run against staging project `lhnbxjvqllohlbtdncyg` selected
190 candidates from the 463 passing candidates:

- 55 snacks;
- 45 breakfast items;
- 38 lunchbox items;
- 10 drinks; and
- 42 treats.

The shortlist spans 38 source categories and 144 brands. Its deterministic
selection hash is
`b36910a681e35bfdd46674debbe1ec7651cd7723344fc1cf6cf54392b8427218`.
The dry run made no staging changes.

## Apply safety

Dry run is the default. Queueing requires all of the following:

- migration `0031_catalog_candidate_shortlist.sql` applied to the designated
  staging project;
- both configured project references matching the Supabase URL;
- `--apply --target staging`;
- exact confirmation `QUEUE_CATALOG_SHORTLIST_TO_STAGING`; and
- no more than 200 unique, still-eligible candidate IDs.

The database function locks and revalidates every candidate, makes one bounded
state transition to `REVIEW_QUEUED`, and writes one audit record per candidate.
It cannot create products or formulations. Promotion remains one product at a
time and still requires independent current manufacturer or package evidence.

## Staging queue result

PR [#13](https://github.com/ahartman0831/SnackCheck/pull/13) passed all five
required checks and was merged at `c47f0ca`. Migration `0031` was then applied
only to the owner-designated staging project `lhnbxjvqllohlbtdncyg`.

The exact guarded apply queued all 190 selected candidates with the same
selection hash recorded above. Independent read-back verified:

- 190 candidates in `REVIEW_QUEUED`;
- 273 candidates remaining in `SCREENED_PASS`;
- 190 matching `CATALOG_CANDIDATE_SHORTLIST_QUEUED` audit rows; and
- zero products and zero formulations.

The queue is private evidence-review work. No candidate was approved or
promoted, no public catalog row was created, no AI was used, and no production
system or feature flag changed.
