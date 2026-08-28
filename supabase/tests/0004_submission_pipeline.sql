begin;
select plan(15);

select has_column('public', 'submissions', 'token_version', 'token version is persisted');
select has_column('public', 'submissions', 'token_expires_at', 'ownership expiry is persisted');
select has_column('public', 'submissions', 'raw_object_path', 'raw object path is persisted');
select has_column('public', 'submissions', 'sanitized_object_path', 'sanitized object path is persisted');
select has_column('public', 'submissions', 'sanitizer_version', 'sanitizer version is persisted');

insert into public.submissions (
  id,
  status,
  anonymous_key_hash,
  token_expires_at,
  raw_object_path
) values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'UPLOAD_PENDING',
  repeat('a', 64),
  now() + interval '1 hour',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/raw.jpg'
);

select lives_ok(
  $$update public.submissions set status = 'UPLOADED' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  'upload pending may advance to uploaded'
);

select throws_ok(
  $$update public.submissions set status = 'APPROVED' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  'illegal submission state transition: UPLOADED -> APPROVED',
  'illegal transitions fail closed'
);

select throws_ok(
  $$insert into public.submissions (id, status, anonymous_key_hash) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'UPLOAD_PENDING', 'forgeable')$$,
  'new row for relation "submissions" violates check constraint "submissions_token_hash_shape"',
  'token hashes must be complete SHA-256 hex values'
);

select throws_ok(
  $$insert into public.submissions (id, status, raw_object_path) values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'UPLOAD_PENDING', 'someone-else/raw.jpg')$$,
  'new row for relation "submissions" violates check constraint "submissions_raw_path_owned"',
  'raw object paths are bound to their submission'
);

select is(
  (select public from storage.buckets where id = 'submission-raw'),
  false,
  'raw submission bucket stays private'
);

select is(
  (select public from storage.buckets where id = 'submission-sanitized'),
  false,
  'sanitized submission bucket stays private'
);

select is(
  (select count(*)::integer from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'no_anon_storage_insert'),
  1,
  'anonymous direct storage inserts remain denied'
);

select is(
  (select value from public.application_settings where key = 'photo_pipeline_kill_switch'),
  'true'::jsonb,
  'photo processing starts globally disabled'
);

select is(
  public.claim_photo_processing_slot(200),
  false,
  'global kill switch blocks processing slots'
);

update public.application_settings
set value = 'false'::jsonb
where key = 'photo_pipeline_kill_switch';

select is(
  public.claim_photo_processing_slot(1),
  true,
  'service-side processing can claim a bounded daily slot when enabled'
);

select * from finish();
rollback;
