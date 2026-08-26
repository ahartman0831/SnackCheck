-- Seeded from the 2026-08-25 primary-source baseline.
-- Production publication still requires the signed review in
-- docs/regulatory-review.md.

insert into public.jurisdictions (id, type, name, slug, parent_id, state_code)
values
  ('11111111-1111-1111-1111-111111111111', 'COUNTRY', 'United States', 'united-states', null, null),
  ('22222222-2222-2222-2222-222222222222', 'STATE', 'Arizona', 'arizona', '11111111-1111-1111-1111-111111111111', 'AZ');

insert into public.regulatory_sources (
  id,
  jurisdiction_id,
  source_type,
  title,
  citation,
  url,
  published_at,
  retrieved_at,
  notes,
  active
) values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '22222222-2222-2222-2222-222222222222',
    'STATUTE',
    'A.R.S. § 15-242.01',
    'A.R.S. § 15-242.01',
    'https://www.azleg.gov/ars/15/00242-01.htm',
    '2025-05-12',
    '2026-08-25T00:00:00Z',
    'Statutory definition of covered ultraprocessed food and the parent-own-child exception.',
    true
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    '22222222-2222-2222-2222-222222222222',
    'STATUTE',
    'Arizona Laws 2025, Chapter 52 / HB 2164',
    'Ariz. Laws 2025, ch. 52',
    'https://www.azleg.gov/legtext/57Leg/1R/laws/0052.pdf',
    '2025-05-12',
    '2026-08-25T00:00:00Z',
    'Enacting legislation for the Arizona Healthy Schools Act.',
    true
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    '22222222-2222-2222-2222-222222222222',
    'AGENCY_GUIDANCE',
    'ADE May 5, 2026 compliance memorandum',
    'Arizona Department of Education, May 5, 2026',
    'https://www.azed.gov/sites/default/files/2026/05/Arizona%20Healthy%20Schools%20Act.pdf',
    '2026-05-05',
    '2026-08-25T00:00:00Z',
    'Agency implementation guidance. Distinct from the statute.',
    true
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
    '22222222-2222-2222-2222-222222222222',
    'AGENCY_GUIDANCE',
    'ADE May 2026 administrator resource and FAQ',
    'Arizona Department of Education, May 2026',
    'https://www.azed.gov/sites/default/files/2026/01/The%20Basics%20of%20the%20Arizona%20Healthy%20Schools%20Act%20Resource%20for%20School%20Administrators.pdf',
    '2026-05-01',
    '2026-08-25T00:00:00Z',
    'FAQ expressly includes student celebrations, birthday parties, prizes/incentives, and classroom snacks.',
    true
  );

insert into public.rulesets (
  id,
  jurisdiction_id,
  code,
  version,
  title,
  effective_from,
  published_at,
  is_published,
  ruleset_hash,
  notes
) values (
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  'AZ-HSA',
  1,
  'Arizona Healthy Schools Act ingredient ruleset',
  '2026-07-01',
  null,
  false,
  null,
  'Seeded for local/dev evaluation. Production launch requires signed regulatory review.'
);

insert into public.ruleset_contexts (
  ruleset_id,
  context,
  applicability_status,
  regulatory_source_id,
  source_locator,
  public_summary,
  enabled
) values
  (
    '33333333-3333-3333-3333-333333333333',
    'SCHOOL_SERVED',
    'APPLIES',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'A.R.S. § 15-242.01',
    'The statute prohibits a participating school from serving covered food on campus during the normal school day.',
    true
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'SCHOOL_SOLD',
    'APPLIES',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'A.R.S. § 15-242.01',
    'The statute prohibits a participating school from selling covered food on campus during the normal school day.',
    true
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'THIRD_PARTY_SOLD',
    'APPLIES',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'A.R.S. § 15-242.01',
    'The statute prohibits a participating school from allowing a third party to sell covered food on campus during the normal school day.',
    true
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'CLASSROOM_DISTRIBUTION',
    'APPLIES',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
    'ADE May 2026 FAQ',
    'ADE guidance states that compliance is campus-wide and includes classroom-based food distribution, including celebrations, birthday parties, prizes/incentives, and classroom snacks. This is agency implementation guidance, not additional statutory text.',
    true
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'FUNDRAISER_DURING_SCHOOL_DAY',
    'UNKNOWN',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'A.R.S. § 15-242.01',
    'The statute addresses serving, selling, and third-party selling during the normal school day. Whether a particular fundraiser is in scope depends on facts not resolved in the seeded sources.',
    true
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'PARENT_OWN_CHILD',
    'PARENT_OWN_CHILD_EXCEPTION',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'A.R.S. § 15-242.01',
    'Arizona''s school-day restriction does not prevent a parent or guardian from providing this food to their own student. Your school may still have other policies, including allergy or campus rules.',
    true
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'UNKNOWN',
    'UNKNOWN',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'A.R.S. § 15-242.01',
    'The selected context is not resolved by the published sources.',
    true
  );

insert into public.prohibited_substances (
  id,
  ruleset_id,
  canonical_name,
  canonical_normalized,
  statutory_ordinal,
  regulatory_source_id,
  source_locator,
  enabled
) values
  ('44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333333', 'Potassium bromate', 'potassium bromate', 1, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'A.R.S. § 15-242.01', true),
  ('44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333333', 'Propylparaben', 'propylparaben', 2, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'A.R.S. § 15-242.01', true),
  ('44444444-4444-4444-4444-444444444403', '33333333-3333-3333-3333-333333333333', 'Titanium dioxide', 'titanium dioxide', 3, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'A.R.S. § 15-242.01', true),
  ('44444444-4444-4444-4444-444444444404', '33333333-3333-3333-3333-333333333333', 'Brominated vegetable oil', 'brominated vegetable oil', 4, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'A.R.S. § 15-242.01', true),
  ('44444444-4444-4444-4444-444444444405', '33333333-3333-3333-3333-333333333333', 'Yellow dye 5', 'yellow dye 5', 5, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'A.R.S. § 15-242.01', true),
  ('44444444-4444-4444-4444-444444444406', '33333333-3333-3333-3333-333333333333', 'Yellow dye 6', 'yellow dye 6', 6, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'A.R.S. § 15-242.01', true),
  ('44444444-4444-4444-4444-444444444407', '33333333-3333-3333-3333-333333333333', 'Blue dye 1', 'blue dye 1', 7, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'A.R.S. § 15-242.01', true),
  ('44444444-4444-4444-4444-444444444408', '33333333-3333-3333-3333-333333333333', 'Blue dye 2', 'blue dye 2', 8, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'A.R.S. § 15-242.01', true),
  ('44444444-4444-4444-4444-444444444409', '33333333-3333-3333-3333-333333333333', 'Green dye 3', 'green dye 3', 9, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'A.R.S. § 15-242.01', true),
  ('44444444-4444-4444-4444-444444444410', '33333333-3333-3333-3333-333333333333', 'Red dye 3', 'red dye 3', 10, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'A.R.S. § 15-242.01', true),
  ('44444444-4444-4444-4444-444444444411', '33333333-3333-3333-3333-333333333333', 'Red dye 40', 'red dye 40', 11, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'A.R.S. § 15-242.01', true);

-- Exact statute terms plus mechanical normalizer variants only.
insert into public.rule_aliases (
  prohibited_substance_id,
  alias,
  normalized_alias,
  match_mode,
  review_status,
  enabled,
  regulatory_source_id
)
select
  s.id,
  v.alias,
  v.normalized_alias,
  'TOKEN_SEQUENCE',
  'EXACT_STATUTE_TERM',
  true,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
from public.prohibited_substances s
join (
  values
    ('44444444-4444-4444-4444-444444444401'::uuid, 'Potassium bromate', 'potassium bromate'),
    ('44444444-4444-4444-4444-444444444402'::uuid, 'Propylparaben', 'propylparaben'),
    ('44444444-4444-4444-4444-444444444403'::uuid, 'Titanium dioxide', 'titanium dioxide'),
    ('44444444-4444-4444-4444-444444444404'::uuid, 'Brominated vegetable oil', 'brominated vegetable oil'),
    ('44444444-4444-4444-4444-444444444405'::uuid, 'Yellow dye 5', 'yellow dye 5'),
    ('44444444-4444-4444-4444-444444444405'::uuid, 'Yellow dye No. 5', 'yellow dye no 5'),
    ('44444444-4444-4444-4444-444444444405'::uuid, 'Yellow dye No 5', 'yellow dye no 5'),
    ('44444444-4444-4444-4444-444444444405'::uuid, 'Yellow dye #5', 'yellow dye no 5'),
    ('44444444-4444-4444-4444-444444444406'::uuid, 'Yellow dye 6', 'yellow dye 6'),
    ('44444444-4444-4444-4444-444444444406'::uuid, 'Yellow dye No. 6', 'yellow dye no 6'),
    ('44444444-4444-4444-4444-444444444406'::uuid, 'Yellow dye #6', 'yellow dye no 6'),
    ('44444444-4444-4444-4444-444444444407'::uuid, 'Blue dye 1', 'blue dye 1'),
    ('44444444-4444-4444-4444-444444444407'::uuid, 'Blue dye No. 1', 'blue dye no 1'),
    ('44444444-4444-4444-4444-444444444407'::uuid, 'Blue dye #1', 'blue dye no 1'),
    ('44444444-4444-4444-4444-444444444408'::uuid, 'Blue dye 2', 'blue dye 2'),
    ('44444444-4444-4444-4444-444444444408'::uuid, 'Blue dye No. 2', 'blue dye no 2'),
    ('44444444-4444-4444-4444-444444444408'::uuid, 'Blue dye #2', 'blue dye no 2'),
    ('44444444-4444-4444-4444-444444444409'::uuid, 'Green dye 3', 'green dye 3'),
    ('44444444-4444-4444-4444-444444444409'::uuid, 'Green dye No. 3', 'green dye no 3'),
    ('44444444-4444-4444-4444-444444444409'::uuid, 'Green dye #3', 'green dye no 3'),
    ('44444444-4444-4444-4444-444444444410'::uuid, 'Red dye 3', 'red dye 3'),
    ('44444444-4444-4444-4444-444444444410'::uuid, 'Red dye No. 3', 'red dye no 3'),
    ('44444444-4444-4444-4444-444444444410'::uuid, 'Red dye #3', 'red dye no 3'),
    ('44444444-4444-4444-4444-444444444411'::uuid, 'Red dye 40', 'red dye 40'),
    ('44444444-4444-4444-4444-444444444411'::uuid, 'Red dye No. 40', 'red dye no 40'),
    ('44444444-4444-4444-4444-444444444411'::uuid, 'Red dye #40', 'red dye no 40')
) as v(substance_id, alias, normalized_alias)
  on s.id = v.substance_id
on conflict (prohibited_substance_id, normalized_alias) do nothing;

-- Pending decision fixtures. Disabled until sourced review.
insert into public.rule_aliases (
  prohibited_substance_id,
  alias,
  normalized_alias,
  match_mode,
  review_status,
  enabled,
  review_notes
) values
  ('44444444-4444-4444-4444-444444444411', 'Allura Red AC', 'allura red ac', 'TOKEN_SEQUENCE', 'PENDING_REVIEW', false, 'International name. Not activated without authoritative provenance.'),
  ('44444444-4444-4444-4444-444444444411', 'E129', 'e129', 'EXACT_SEGMENT', 'PENDING_REVIEW', false, 'E-number. Not activated without authoritative provenance.'),
  ('44444444-4444-4444-4444-444444444411', 'Red 40 Lake', 'red 40 lake', 'TOKEN_SEQUENCE', 'PENDING_REVIEW', false, 'Lake form. Not activated without authoritative provenance.');

update public.rulesets
set ruleset_hash = encode(
  sha256(
    convert_to((
      select string_agg(canonical_normalized || ':' || statutory_ordinal::text, '|' order by statutory_ordinal)
      from public.prohibited_substances
      where ruleset_id = '33333333-3333-3333-3333-333333333333'
        and enabled
    ) || '|' || (
      select string_agg(normalized_alias || ':' || match_mode::text, '|' order by normalized_alias)
      from public.rule_aliases a
      join public.prohibited_substances s on s.id = a.prohibited_substance_id
      where s.ruleset_id = '33333333-3333-3333-3333-333333333333'
        and a.enabled
    ) || '|' || (
      select string_agg(context || ':' || applicability_status::text, '|' order by context)
      from public.ruleset_contexts
      where ruleset_id = '33333333-3333-3333-3333-333333333333'
        and enabled
    ), 'utf8')
  ),
  'hex'
)
where id = '33333333-3333-3333-3333-333333333333';

update public.rulesets
set is_published = true,
    published_at = '2026-08-26T00:00:00Z'
where id = '33333333-3333-3333-3333-333333333333';
