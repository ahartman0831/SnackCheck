# Private extraction evaluation corpus

Keep package photos outside Git unless SnackCheck has documented redistribution rights.
Each private case should pair one local sanitized JPEG with separately reviewed expected
metadata: panel presence, exact ingredient text, ingredient segments, and image-quality
warnings. Do not include or score any compliance determination.

The private set should cover clear panels, glare, blur, curved packaging, vertical text,
multiple languages, nested ingredients, precautionary statements, very long lists, no
ingredient panel, adversarial package text, and corrupted input. Record provider/model,
prompt and schema versions, attempts, latency, usage, and estimated cost with each run.

Use `scoreExtractionObservation` and `summarizeExtractionScores` from
`apps/web/lib/ai/evaluation.ts` to report panel detection, exact and normalized text,
ingredient segmentation, warning recall, escalation, false confidence, latency, and cost.
