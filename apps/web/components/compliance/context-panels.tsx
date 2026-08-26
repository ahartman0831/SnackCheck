import { PARENT_OWN_CHILD_DISCLAIMER } from "@/lib/copy";
import type { ComplianceResult } from "@snackcheck/contracts";

export function ContextPanels({
  classroom,
  ownChild,
}: {
  classroom: ComplianceResult;
  ownChild: ComplianceResult;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="border-border bg-surface rounded-2xl border p-5">
        <h2 className="text-lg font-semibold">For classroom distribution</h2>
        <p className="text-muted mt-2">{classroom.explanation.contextSummary}</p>
      </section>
      <section className="border-border bg-surface rounded-2xl border p-5">
        <h2 className="text-lg font-semibold">For your child&apos;s own lunch/snack</h2>
        <p className="text-muted mt-2">{ownChild.explanation.contextSummary}</p>
        <p className="text-muted mt-3 text-sm">{PARENT_OWN_CHILD_DISCLAIMER}</p>
      </section>
    </div>
  );
}
