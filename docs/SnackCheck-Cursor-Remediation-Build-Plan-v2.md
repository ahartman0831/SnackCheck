# SnackCheck Cursor Remediation & Launch Build Plan v2

**Project:** SnackCheck  
**Repository:** https://github.com/ahartman0831/SnackCheck  
**Prepared:** August 26, 2026  
**Purpose:** Move the audited repository from a strong scaffold to a polished, production-capable Arizona beta and then full V1.

This is an **existing-repository remediation plan**, not a greenfield build.

## 0. Instructions to Cursor

1. Read repository root instructions and `apps/web/AGENTS.md`.
2. Inspect the existing implementation before adding files. Reuse the monorepo, contracts, compliance engine, schema, API envelope, and repositories where they are sound.
3. Read Next.js 16 docs in `apps/web/node_modules/next/dist/docs/` before changing routing, caching, metadata, service-worker, or server/client APIs.
4. Do not overwrite unrelated user changes.
5. Execute **one numbered phase at a time**. At the end of each phase: run every required validation command; summarize files, migrations, tests, and remaining risks; **stop and wait for approval**.
6. Never bypass dependency minimum-release-age or other supply-chain safeguards.
7. Do not mark a phase complete because interfaces or placeholder pages exist.
8. Update `docs/implementation-status.md` truthfully after each phase using `COMPLETE`, `PARTIAL`, `BLOCKED`, or `NOT STARTED`.

### Absolute non-negotiables

- An LLM must never make a regulatory compliance determination.
- AI may transcribe an ingredient panel. Only the deterministic engine may return PASS, FAIL, or VERIFY.
- No production PASS from a hard-coded fallback ruleset, missing/unpublished ruleset, incomplete formulation, parser warning, low-confidence extraction, unresolved conflict, or stale evidence.
- Do not invent aliases, ingredients, source dates, images, UPCs, school participation, prices, or verification status.
- A human must review and sign the Arizona ruleset and alias corpus before production publication.
- Affiliate economics must never affect compliance, verification, search ranking, or approved-list inclusion.
- User-visible labels must describe current behavior. Do not call manual entry “camera scanning.” Do not advertise photo extraction before the image pipeline works.

**AI extracts. Rules decide. Sources prove. Database remembers.**

## 1. Release strategy

### Target A — Honest Arizona beta

Reviewed immutable Arizona data; production-backed search and results; at least 50 current sourced products; manual UPC; manual ingredient text; approved browsing; PASS/FAIL/VERIFY evidence and freshness; secure admin and minimum moderation; monitoring, rate limits, privacy/terms, backups, rollback, phone testing. Camera and photo features stay behind disabled flags until complete.

### Target B — Full public V1

Live camera barcode; secure ingredient-photo capture/upload; Gemini structured extraction; OpenAI fallback only for failed/low-confidence Gemini; confirmation; formulation/evidence/evaluation persistence; community conflicts and admin queues; 100–300 sourced products; functional admin; PWA only if advertised.

## 2. Preserve

pnpm monorepo; Next.js 16 / React 19; Supabase; Vercel; `packages/compliance` as a pure deterministic module; `packages/contracts`; versioned products/formulations/rulesets; three separate determinations; internal-first providers; no parent accounts; labeled dev fixtures that cannot serve in production.

## 3–4. Architecture and AI

AI exists only in the image-to-structured-text branch. Primary: `gemini-3.5-flash-lite`. Escalation: `gemini-3.5-flash`. Fallback: `gpt-5.6-luna`. Never more than three provider calls per sanitized image. Providers must not import the compliance engine or return PASS/FAIL/VERIFY. Shared Zod schema lives in `packages/contracts`. Confirm before evaluate.

Target `apps/web/lib/ai/` (orchestrator, Gemini/OpenAI providers, Anthropic stub) is Phase 7, not Phase 0.

## 5. Visual direction

High-trust scanner tech (Geist / Geist Mono, indigo-cyan accents, light/dark). Phases 3–4. Do not start in Phase 0.

## 6–8. Later migrations and APIs

Forward-only: `0016` regulatory hardening, `0017` public product projection, `0018` submission/AI pipeline, `0019` retailers/affiliates, `0020` admin operations. Public reads keep the existing envelope. Submission tokens must be HMAC/JWT, not a prefix cookie.

## 9–14. Later work

Upload order, fail-closed ruleset loading, OFF hardening, affiliates/support, rate limits, Sentry, and the expanded `.env.example` are Phases 1–10. Disabled features must not require unused secrets.

## 15. Sequential phases

### Phase 0 — Baseline and truthful status (this execution)

- Verify commit and working tree.
- Run clean install without bypassing supply-chain protection.
- Run format, lint, typecheck, unit tests, build, and database checks.
- Add a failing regression test for each audited critical defect before fixing it.
- Replace inaccurate implementation-status claims.
- Add `docs/remediation-baseline.md`.

Acceptance: clean CI captured **or** exact blockers documented; every P0 has a test or a human/ops gate; no feature described as complete when only scaffolded.

### Phase 1 — Regulatory fail-closed hardening

Migration `0016`. `UNAVAILABLE` instead of production fixture fallback. Parser warnings force VERIFY. Hash parity. Draft/clone/publish. Do not start until Phase 0 is approved.

### Phases 2–11

Product projection and import; rebrand; public UI; camera; secure upload; Gemini/OpenAI confirmation; admin; affiliates; observability/PWA/CI; launch data and deployment. See the original v2 specification in the 2026-08-26 remediation chat for screen-level, schema, and eval-set detail.

## 16–19. Testing, budgets, human gates, definition of done

Unit/pgTAP/integration/E2E/a11y as specified in the source plan. Performance budgets are measurement targets, not claims. Cursor must stop for signed regulatory review, alias approval, legal/affiliate review, secrets, and go-live.

V1 is done only when production is fail-closed, sourced, confirmed-extraction-only, and the UI matches current behavior.

## 20. First command

Execute **Phase 0 only**. Do not begin Phase 1.
