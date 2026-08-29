# Phase 7 staging extraction evaluation

Date: 2026-08-29

Outcome: `PASS` for merging the flag-off Phase 7 implementation. Phase 7 remains
`PARTIAL` until the real-phone photo paths in the master plan are rehearsed.

## Fixed decision gates

- Panel detection must be correct for every case, including a real no-panel image.
- Average normalized transcription accuracy must be at least 95%.
- False-confidence rate must be zero.
- Orchestration must make no more than one provider call per image.
- Total estimated provider cost must remain below $0.03 for ten images.
- Every call must have a private usage-ledger row based on provider-reported usage.
- No extraction may bypass the confirmation screen or return a compliance result.
- Both staging kill switches must be restored to `true` after the run.

Ingredient segmentation is recorded as a diagnostic metric, not a merge gate. It
is candidate structure only. SnackCheck deterministically re-parses the text after
the person corrects and confirms it.

## Corpus and rights

The run used ten real package images from the Open Food Facts AI ingredient-panel
test release: nine ingredient panels and one genuine no-panel package image. The
set covered clear and dense text, glare, blur/low resolution, curved packaging,
nested ingredients, and precautionary text. No corpus images were committed to
Git.

Open Food Facts publishes its image dataset under CC BY-SA 3.0 and documents
small direct image downloads for evaluation:

- https://blog.openfoodfacts.org/en/news/open-food-facts-images-on-aws-open-dataset-the-ultimate-food-image-database
- https://openfoodfacts.github.io/openfoodfacts-server/api/how-to-download-images/
- https://github.com/openfoodfacts/openfoodfacts-ai/releases

Evaluated barcodes, in run order:

1. `3476651880051` — no ingredient panel
2. `8901030530333` — wide, low-resolution soup panel
3. `0028400516464` — dense chips panel with glare
4. `8801019608940` — curved honey-butter package
5. `9310988013581` — clear short chips panel
6. `5036589253150` — curved yogurt package
7. `5000169491980` — narrow pasta panel
8. `0705599014697` — small box-side panel
9. `0894700010175` — high-contrast yogurt panel
10. `0194346000609` — curved sauce container

## Measured result

- Provider/model: OpenAI `gpt-5.6-luna`
- Prompt: `p7-v1` (unchanged)
- Panel detection: 100%
- Normalized transcription accuracy: 98.99%
- Top-level ingredient segmentation F1: 88.78%
- False-confidence rate: 0%
- Provider escalation rate: 0%
- Average provider latency: 11.378 seconds
- Total estimated cost: $0.02082154
- Usage coverage: 10/10 provider-reported and rate-card priced
- Provider calls: exactly one per image

The no-panel image failed closed. Eight readable panels were accepted as candidate
transcriptions; the degraded soup panel was explicitly marked low confidence with
blur, crop, low-resolution, and unreadable-text warnings. All nine readable panels
went only to the private confirmation screen. No result was confirmed or evaluated
during this corpus run.

The source dataset does not label image-quality warnings, so warning recall was not
claimed as a numeric corpus result. The model did surface warnings on the visually
degraded no-panel, soup, glare, and curved/blurred yogurt cases.

## Finding and correction

The initial two-case preflight found that the previous 12-second provider timeout
could reject a readable dense panel. The timeout remains bounded but was raised to
30 seconds in commit `fd6ec8e`. The official ten-image run used that exact code.
Maximum calls stayed at one, so this did not increase provider-call spend.

The prompt was not tightened because the core transcription and safety gates passed.
Changing it after a passing run would invalidate the evidence. Segmentation can be
improved later without changing the authoritative confirmation and deterministic
evaluation path.

## Safety closeout

- Supabase project: staging project `lhnbxjvqllohlbtdncyg`
- AI daily counter after run: 10
- Photo daily counter after run: 10
- `ai_extraction_kill_switch`: `true`
- `photo_pipeline_kill_switch`: `true`
- Production Vercel variables and feature flags: unchanged
- Rulesets published: none
- Human confirmations/evaluations created by this run: none

## Remaining before Phase 7 can be `COMPLETE`

- Rehearse clear, glare, blur, curved-package, no-panel, outage, correction, and
  cancel/retake paths on a current phone against the protected preview.
- Resolve or deliberately replace the unproven Gemini primary-provider path before
  treating Gemini as production-ready.
- Separately approve any production rollout; merging this flag-off code is not a
  production feature enablement.
