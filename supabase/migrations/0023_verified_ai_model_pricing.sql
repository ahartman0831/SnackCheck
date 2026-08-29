insert into public.ai_model_pricing (
  provider,
  model,
  effective_from,
  effective_until,
  input_usd_per_million,
  cached_input_usd_per_million,
  output_usd_per_million,
  source_url,
  source_note
)
values
  (
    'gemini',
    'gemini-3.5-flash-lite',
    '2026-08-29 00:00:00+00',
    null,
    0.30,
    0.03,
    2.50,
    'https://ai.google.dev/gemini-api/docs/pricing',
    'Verified against the official Gemini API pricing page on 2026-08-29.'
  ),
  (
    'gemini',
    'gemini-3.7-flash',
    '2026-08-29 00:00:00+00',
    '2027-01-01 00:00:00+00',
    0.75,
    0.075,
    3.75,
    'https://ai.google.dev/gemini-api/docs/pricing',
    'Introductory pricing verified on 2026-08-29; valid through 2026-12-31.'
  ),
  (
    'openai',
    'gpt-5.6-luna',
    '2026-08-29 00:00:00+00',
    null,
    0.20,
    0.02,
    1.20,
    'https://developers.openai.com/api/docs/models/compare',
    'Verified against the official OpenAI model comparison on 2026-08-29.'
  )
on conflict (provider, model, effective_from)
do update set
  effective_until = excluded.effective_until,
  input_usd_per_million = excluded.input_usd_per_million,
  cached_input_usd_per_million = excluded.cached_input_usd_per_million,
  output_usd_per_million = excluded.output_usd_per_million,
  source_url = excluded.source_url,
  source_note = excluded.source_note;
