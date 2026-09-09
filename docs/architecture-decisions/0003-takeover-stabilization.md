# 0003 — Preserve the evidence architecture and repair its operational boundaries

Date: 2026-09-08. Status: accepted for local implementation.

The inherited product has a coherent deterministic engine, shared schema contracts,
role-aware Supabase clients and transactional evidence review. Historical roadmaps
disagree on sequencing and the old vision wrapper duplicates the active extractor.

Keep the architecture. Repair abuse limits and session refresh before expanding
the catalog tooling. Preserve regulatory publication, source-permission and
production-launch approval boundaries. Do not equate staging reports with fresh
verification. Archive old plans by reference; the takeover audit, definition of
done and dated implementation status control current work.

Remove the unreferenced vision wrapper; retain the `lib/ai` orchestrator. Keep
operator evidence comparison separate because it consumes different evidence and
cannot substitute for user confirmation. Retain the three Supabase client roles:
they represent security boundaries, not duplication. No destructive migration or
production data change is required by this decision.

Restore sessions at the Next.js proxy request boundary while retaining role checks
in pages/routes and SQL. Use actual endpoint limit/window values with isolated
Redis namespaces and reject timeouts for costly operations. Never use analytics
failure as a reason to prevent a public result.

References: installed Next.js proxy/cookies docs; [Supabase SSR guide](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs);
[Upstash rate-limit behavior](https://upstash.com/docs/redis/sdks/ratelimit-ts/features).
