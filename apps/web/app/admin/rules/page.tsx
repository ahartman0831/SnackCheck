import { requireAdmin } from "@/lib/auth/require-admin";

export default async function AdminRulesPage() {
  const auth = await requireAdmin(["REGULATORY_ADMIN", "SUPER_ADMIN"]);
  if (!auth.allowed)
    return (
      <>
        <h1 className="text-2xl font-semibold">Regulatory admin access required</h1>
        <p className="text-muted mt-3">No ruleset data was loaded.</p>
      </>
    );
  return (
    <div>
      <h1 className="text-2xl font-semibold">Rulesets</h1>
      <p className="text-muted mt-3">
        Draft from a published version, require sources before enabling aliases, then
        publish an immutable snapshot. Reviewers cannot publish.
      </p>
    </div>
  );
}
