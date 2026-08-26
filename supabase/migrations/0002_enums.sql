create type public.jurisdiction_type as enum (
  'COUNTRY',
  'STATE',
  'DISTRICT',
  'SCHOOL'
);

create type public.source_type as enum (
  'STATUTE',
  'AGENCY_GUIDANCE',
  'MANUFACTURER',
  'PACKAGE_PHOTO',
  'EXTERNAL_DATABASE',
  'COMMUNITY_SUBMISSION',
  'ADMIN_ENTRY'
);

create type public.verification_status as enum (
  'VERIFIED',
  'PACKAGE_VERIFIED',
  'EXTERNAL_DATABASE',
  'COMMUNITY_SUBMITTED',
  'STALE',
  'CONFLICT',
  'REJECTED'
);

create type public.alias_review_status as enum (
  'EXACT_STATUTE_TERM',
  'AUTHORITATIVE_SYNONYM',
  'EXPERT_VERIFIED',
  'PENDING_REVIEW',
  'REJECTED'
);

create type public.ingredient_status as enum (
  'PASS',
  'FAIL',
  'VERIFY'
);

create type public.applicability_status as enum (
  'APPLIES',
  'PARENT_OWN_CHILD_EXCEPTION',
  'OUTSIDE_NORMAL_SCHOOL_DAY',
  'SCHOOL_NOT_CONFIRMED_PARTICIPATING',
  'UNKNOWN'
);

create type public.local_policy_status as enum (
  'ALLOWED_BY_VERIFIED_POLICY',
  'RESTRICTED_BY_VERIFIED_POLICY',
  'NO_VERIFIED_POLICY',
  'NOT_REQUESTED'
);

create type public.submission_status as enum (
  'UPLOAD_PENDING',
  'UPLOADED',
  'PROCESSING',
  'NEEDS_CONFIRMATION',
  'CONFIRMED',
  'EVALUATED',
  'REVIEW_PENDING',
  'APPROVED',
  'REJECTED',
  'FAILED'
);

create type public.match_mode as enum (
  'EXACT_SEGMENT',
  'TOKEN_SEQUENCE',
  'REVIEWED_REGEX'
);

create type public.admin_role as enum (
  'REVIEWER',
  'REGULATORY_ADMIN',
  'SUPER_ADMIN'
);
