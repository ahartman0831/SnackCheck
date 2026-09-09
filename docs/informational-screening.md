# Informational-screening beta

This owner-requested model supersedes the separate-reviewer/publisher launch gate
in earlier plans and review packets. SnackCheck supplies information; it is not a
certifying authority, regulator, legal-compliance service, or final decision-maker.

## Approval and optional review

One active `REGULATORY_ADMIN` or `SUPER_ADMIN` may check the sourced version and
approve/publish it at `/admin/rules`. The acknowledgement and typed `PUBLISH`
confirmation express that admin's approval for informational use. The database
records the signed-in actor, timestamp, canonical hash, version, and audit event.
A separate human or expert review is optional; the same admin may also publish a
version they reviewed. An optional recorded review must include a real reviewer,
timestamp, HTTPS document and SHA-256. No review identity is invented when omitted.

Publication still requires primary sources, all eleven enabled statutory substances,
source locators, sourced/approved enabled aliases and contexts, and the current
canonical hash. Missing sources, stale content or changed optional review state,
unauthorized/inactive users, and repeat publication are rejected. The 28 proposed
color aliases remain disabled. No rules, roles, catalog data, or hosted settings
are changed by migration `0040_informational_ruleset_publication.sql`.

Published content, publication timestamps, citations in the snapshot, and optional
review metadata remain immutable. Every update is a new version. To roll back rule
content, choose the prior published version in `/admin/rules`, clone it to a new
draft, inspect its sources/effective dates/current hash, then explicitly approve
and publish the new version. The clone and publication are audited; prior versions
remain in history. Never rewrite a published version or reverse migrations. This
procedure is tested only with disposable fixtures; no hosted rollback is performed.

## Public result language

- `FAIL` → **Potential listed restriction found**: the available text matched a
  listed ingredient; verify the match and applicable rules.
- `PASS` → **No listed restriction found**: no listed match was found in the
  available text under that version. This is not approval or proof of safety,
  eligibility, or legal compliance.
- `VERIFY` → **Needs verification**: rules or evidence are missing, incomplete,
  stale, conflicted, precautionary-only, or unconfirmed.

The internal codes and quality gates stay stable for storage/API compatibility.
Unverified pasted no-match text still needs verification. Engine `0.1.3` versions
the explanation changes; matching logic is unchanged. Result cards, badges, metadata,
browse copy and rules/terms pages use informational wording. Prominent disclaimers
direct users to check the current package and their school or governing authority.
Disclaimers describe the product's limits; no reduction in legal liability is claimed.

Independent review is not a beta launch blocker. Owner approval to publish an actual
ruleset, hosted migration, production deployment and public launch remain separate
external actions. The current PR authorizes none of them. Domains, email, paid
services, deletion automation and catalog expansion remain deferred.
