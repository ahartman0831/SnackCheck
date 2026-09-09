-- Stage FDA-supported short label forms for review in the original unsigned draft.
-- Never edit a reviewed or published ruleset, or claim a human signed this update.
do $$
begin
  if not exists (select 1 from public.rulesets where id='33333333-3333-3333-3333-333333333333'
    and not is_published and reviewed_by is null and reviewed_at is null) then
    raise exception 'color alias update requires the original unsigned draft';
  end if;
  if (select count(*) from public.prohibited_substances where ruleset_id='33333333-3333-3333-3333-333333333333'
    and canonical_name in ('Yellow dye 5','Yellow dye 6','Blue dye 1','Blue dye 2','Green dye 3','Red dye 3','Red dye 40')) <> 7 then
    raise exception 'all seven expected draft color substances are required';
  end if;
end $$;

insert into public.regulatory_sources (id,jurisdiction_id,source_type,title,citation,url,published_at,retrieved_at,notes,active)
values ('a0390000-0000-4000-8000-000000000001','11111111-1111-1111-1111-111111111111','AGENCY_GUIDANCE',
'FDA color additive label names','FDA: Color Additives Questions and Answers for Consumers',
'https://www.fda.gov/food/color-additives-information-consumers/color-additives-questions-and-answers-consumers',null,now(),
'Lists the seven numbered FD&C colors and recognizes abbreviated label names such as Blue 1. Used for name identity, not Arizona applicability or a health-safety claim.',true);

insert into public.rule_aliases (id,prohibited_substance_id,alias,normalized_alias,match_mode,review_status,enabled,regulatory_source_id,review_notes)
select v.id,s.id,v.alias,v.normalized_alias,'EXACT_SEGMENT','PENDING_REVIEW',false,'a0390000-0000-4000-8000-000000000001',
'Proposed FDA-supported full/abbreviated numbered color name; named reviewer required before enablement. Exact parsed-segment matching only; no inferred lakes, E-numbers or chemical synonyms. Ruleset remains unsigned and unpublished.'
from (values
    ('a0390001-0000-4000-8000-000000000051'::uuid, 'Yellow dye 5', 'Yellow 5', 'yellow 5'),
    ('a0390001-0000-4000-8000-000000000052'::uuid, 'Yellow dye 5', 'Yellow No. 5', 'yellow no 5'),
    ('a0390001-0000-4000-8000-000000000053'::uuid, 'Yellow dye 5', 'FD&C Yellow 5', 'fd and c yellow 5'),
    ('a0390001-0000-4000-8000-000000000054'::uuid, 'Yellow dye 5', 'FD&C Yellow No. 5', 'fd and c yellow no 5'),
    ('a0390001-0000-4000-8000-000000000061'::uuid, 'Yellow dye 6', 'Yellow 6', 'yellow 6'),
    ('a0390001-0000-4000-8000-000000000062'::uuid, 'Yellow dye 6', 'Yellow No. 6', 'yellow no 6'),
    ('a0390001-0000-4000-8000-000000000063'::uuid, 'Yellow dye 6', 'FD&C Yellow 6', 'fd and c yellow 6'),
    ('a0390001-0000-4000-8000-000000000064'::uuid, 'Yellow dye 6', 'FD&C Yellow No. 6', 'fd and c yellow no 6'),
    ('a0390001-0000-4000-8000-000000000071'::uuid, 'Blue dye 1', 'Blue 1', 'blue 1'),
    ('a0390001-0000-4000-8000-000000000072'::uuid, 'Blue dye 1', 'Blue No. 1', 'blue no 1'),
    ('a0390001-0000-4000-8000-000000000073'::uuid, 'Blue dye 1', 'FD&C Blue 1', 'fd and c blue 1'),
    ('a0390001-0000-4000-8000-000000000074'::uuid, 'Blue dye 1', 'FD&C Blue No. 1', 'fd and c blue no 1'),
    ('a0390001-0000-4000-8000-000000000081'::uuid, 'Blue dye 2', 'Blue 2', 'blue 2'),
    ('a0390001-0000-4000-8000-000000000082'::uuid, 'Blue dye 2', 'Blue No. 2', 'blue no 2'),
    ('a0390001-0000-4000-8000-000000000083'::uuid, 'Blue dye 2', 'FD&C Blue 2', 'fd and c blue 2'),
    ('a0390001-0000-4000-8000-000000000084'::uuid, 'Blue dye 2', 'FD&C Blue No. 2', 'fd and c blue no 2'),
    ('a0390001-0000-4000-8000-000000000091'::uuid, 'Green dye 3', 'Green 3', 'green 3'),
    ('a0390001-0000-4000-8000-000000000092'::uuid, 'Green dye 3', 'Green No. 3', 'green no 3'),
    ('a0390001-0000-4000-8000-000000000093'::uuid, 'Green dye 3', 'FD&C Green 3', 'fd and c green 3'),
    ('a0390001-0000-4000-8000-000000000094'::uuid, 'Green dye 3', 'FD&C Green No. 3', 'fd and c green no 3'),
    ('a0390001-0000-4000-8000-000000000101'::uuid, 'Red dye 3', 'Red 3', 'red 3'),
    ('a0390001-0000-4000-8000-000000000102'::uuid, 'Red dye 3', 'Red No. 3', 'red no 3'),
    ('a0390001-0000-4000-8000-000000000103'::uuid, 'Red dye 3', 'FD&C Red 3', 'fd and c red 3'),
    ('a0390001-0000-4000-8000-000000000104'::uuid, 'Red dye 3', 'FD&C Red No. 3', 'fd and c red no 3'),
    ('a0390001-0000-4000-8000-000000000111'::uuid, 'Red dye 40', 'Red 40', 'red 40'),
    ('a0390001-0000-4000-8000-000000000112'::uuid, 'Red dye 40', 'Red No. 40', 'red no 40'),
    ('a0390001-0000-4000-8000-000000000113'::uuid, 'Red dye 40', 'FD&C Red 40', 'fd and c red 40'),
    ('a0390001-0000-4000-8000-000000000114'::uuid, 'Red dye 40', 'FD&C Red No. 40', 'fd and c red no 40')
) v(id,canonical_name,alias,normalized_alias)
join public.prohibited_substances s on s.canonical_name=v.canonical_name
and s.ruleset_id='33333333-3333-3333-3333-333333333333';

-- Disabled proposals are excluded from the canonical hash; no active rule changes.
