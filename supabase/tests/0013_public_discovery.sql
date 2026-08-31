begin;
select plan(6);

select has_function(
  'public', 'list_approved_discovery_products',
  array['text', 'text', 'verification_status', 'boolean', 'integer', 'integer'],
  'public discovery projection exists'
);

select function_privs_are(
  'public', 'list_approved_discovery_products',
  array['text', 'text', 'verification_status', 'boolean', 'integer', 'integer'],
  'anon', array['EXECUTE'],
  'anonymous visitors may browse the public discovery projection'
);

select function_privs_are(
  'public', 'list_approved_discovery_products',
  array['text', 'text', 'verification_status', 'boolean', 'integer', 'integer'],
  'service_role', array['EXECUTE'],
  'service operations retain discovery access'
);

select is(
  (select count(*)::int from public.list_approved_discovery_products(null, null, null, null, 100, 0)),
  0,
  'discovery stays empty while the Arizona ruleset is unpublished'
);

select ok(
  pg_get_functiondef(
    'public.list_approved_discovery_products(text,text,public.verification_status,boolean,integer,integer)'::regprocedure
  ) like '%list_approved_public_products%',
  'discovery starts from the canonical strict approved projection'
);

select ok(
  pg_get_functiondef(
    'public.list_approved_discovery_products(text,text,public.verification_status,boolean,integer,integer)'::regprocedure
  ) not like '%affiliate%',
  'discovery ordering has no affiliate input'
);

select * from finish();
rollback;
