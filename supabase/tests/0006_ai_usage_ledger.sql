begin;
select plan(15);

select has_table('public', 'ai_model_pricing', 'versioned AI model pricing exists');
select has_table('public', 'ai_usage_ledger', 'private AI usage ledger exists');
select has_view('public', 'ai_usage_daily_summary', 'daily AI usage summary exists');
select has_column('public', 'ai_usage_ledger', 'input_tokens', 'input tokens are tracked');
select has_column('public', 'ai_usage_ledger', 'cached_input_tokens', 'cached input tokens are tracked');
select has_column('public', 'ai_usage_ledger', 'output_tokens', 'output tokens are tracked');
select has_column('public', 'ai_usage_ledger', 'reasoning_tokens', 'reasoning tokens are tracked');
select has_column('public', 'ai_usage_ledger', 'billed_cost_usd', 'provider-billed cost can be reconciled');
select hasnt_column('public', 'ai_usage_ledger', 'prompt', 'prompts are never copied into spend records');
select hasnt_column('public', 'ai_usage_ledger', 'image', 'images are never copied into spend records');

insert into public.ai_model_pricing (
  provider,
  model,
  effective_from,
  input_usd_per_million,
  cached_input_usd_per_million,
  output_usd_per_million,
  source_url
) values (
  'fixture',
  'metered-test-model',
  '2026-01-01T00:00:00Z',
  0.5,
  0.1,
  2.0,
  'https://example.com/test-pricing'
);

insert into public.products (id, brand, name, slug)
values (
  '22222222-2222-2222-2222-222222222222',
  'Usage Test Brand',
  'Usage Test Product',
  'usage-test-product'
);

insert into public.submissions (
  id, product_id, status, anonymous_key_hash, token_expires_at
) values (
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  'UPLOAD_PENDING',
  repeat('3', 64),
  now() + interval '1 hour'
);

insert into public.extraction_attempts (
  id,
  submission_id,
  sanitized_sha256,
  attempt_ordinal,
  provider,
  model,
  prompt_version,
  provider_request_id,
  outcome,
  latency_ms,
  input_tokens,
  cached_input_tokens,
  output_tokens,
  reasoning_tokens,
  is_retry,
  is_escalation,
  created_at
) values (
  '44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333333',
  repeat('4', 64),
  1,
  'fixture',
  'metered-test-model',
  'p7-test',
  'safe-request-id',
  'ACCEPTED',
  125,
  1000,
  200,
  500,
  100,
  false,
  false,
  '2026-08-28T00:00:00Z'
);

select is(
  (select total_tokens from public.ai_usage_ledger where extraction_attempt_id = '44444444-4444-4444-4444-444444444444'),
  1500,
  'total tokens are calculated without double-counting token subcategories'
);
select is(
  (select estimated_input_cost_usd from public.ai_usage_ledger where extraction_attempt_id = '44444444-4444-4444-4444-444444444444'),
  0.00042::numeric,
  'cached and uncached input token costs use the applicable rate snapshot'
);
select is(
  (select estimated_output_cost_usd from public.ai_usage_ledger where extraction_attempt_id = '44444444-4444-4444-4444-444444444444'),
  0.001::numeric,
  'output token cost uses the applicable rate snapshot'
);
select is(
  (select estimated_total_cost_usd from public.ai_usage_ledger where extraction_attempt_id = '44444444-4444-4444-4444-444444444444'),
  0.00142::numeric,
  'the ledger snapshots detailed estimated spend per provider call'
);
select is(
  (select provider_calls::integer from public.ai_usage_daily_summary where provider = 'fixture' and model = 'metered-test-model'),
  1,
  'daily summary rolls up provider calls'
);

select * from finish();
rollback;
