# Owner production handoff — ingredient-screening beta

Complete this one record using account/project identifiers and assignments. Share
credentials through the application's environment controls, never this file.
Staging `lhnbxjvqllohlbtdncyg` is not production. No new purchase is authorized here.

- Production Supabase project reference: **pending owner**
- Production Vercel project and account: **pending owner confirmation**
- Final domain / `NEXT_PUBLIC_APP_URL`: **pending owner**
- Real monitored `SUPPORT_EMAIL`: **pending owner**
- SMTP provider and verified sending domain: **pending owner**
- Production Upstash project/account: **pending owner**
- Alert recipient and operational contact: **pending owner**
- Backup plan/account and restore operator: **pending owner**
- Rules reviewer and different publishing administrator: **pending owner**

The registered OFF contact is already configured for staging and need not be
provided again. It is not automatically the site's support address.

After access is supplied, engineering performs the technical setup and records:

1. A private preview of the release commit using the correct production-target
   configuration; camera/photo/paid AI/affiliates remain off.
2. Schema setup from migrations 0001–0039 on the new project, generated types,
   private storage, role isolation and rules hash checks. Never generic `db push`
   the existing staging project: its recorded migration history differs from the
   manually applied, verified schema. Reconcile it separately if staging is reused.
3. Real admin OTP delivery, expired-session refresh/logout, unauthenticated denial,
   production Upstash enforcement, support contact and the full ingredient journey.
4. Synthetic health/alert delivery, agreed retention schedule with dry-run counts,
   backup restore into a separate project, and rollback to a known deployment.
5. Exact deployment URL/commit, verified published rules hash, results and remaining
   exceptions for the owner's final launch decision.

The owner approves accounts, costs, wording and public release. Local fixtures and
CI success do not count as successful production SMTP, provider, device or recovery
verification. A database backup alone does not establish image-object recovery;
verify storage recovery separately if photos are later enabled.
