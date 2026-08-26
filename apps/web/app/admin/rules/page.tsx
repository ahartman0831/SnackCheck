export default function AdminRulesPage() {
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
