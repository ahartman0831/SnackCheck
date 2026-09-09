import type { Metadata } from "next";
import { INGREDIENT_CHECK_SCOPE, LOCAL_RULES_DISCLAIMER } from "@/lib/copy";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Terms",
  path: "/terms",
  description: "Terms for using the SnackCheck Arizona ingredient check.",
});

export default function TermsPage() {
  return (
    <article className="flex max-w-3xl flex-col gap-4">
      <h1 className="text-3xl font-semibold">Terms</h1>
      <h2 className="text-xl font-semibold">What the ingredient check means</h2>
      <p>{INGREDIENT_CHECK_SCOPE}</p>
      <p>
        “No listed restriction found” means no listed match was found in the checked text
        under the selected ruleset. “Potential listed restriction found” flags a text
        match to verify. “Needs verification” indicates missing or uncertain information.
        It does not certify overall legal compliance, nutritional quality, or suitability
        for a particular child.
      </p>
      <h2 className="text-xl font-semibold">Labels and source information</h2>
      <p>
        Recipes, package sizes and ingredient labels can change. Database records,
        transcriptions and source comparisons may be incomplete, outdated or incorrect.
        Compare the ingredient text shown here with the package you have. If it differs or
        is unclear, verify the ingredients with the manufacturer before relying on the
        result. For allergies or medical dietary needs, follow the advice of your
        qualified healthcare professional and the current package labeling.
      </p>
      <h2 className="text-xl font-semibold">How automation is used</h2>
      <p>
        The ingredient check uses defined matching rules. Where enabled, AI assists with
        label transcription and comparison of source information; it does not certify food
        safety or decide legal compliance. AI output can contain errors. Confirm
        transcribed ingredient text before checking it.
      </p>
      <h2 className="text-xl font-semibold">School decisions and advice</h2>
      <p>{LOCAL_RULES_DISCLAIMER}</p>
      <p>
        SnackCheck provides information, not medical, nutritional or legal advice. It is
        an independent service and is not endorsed by the State of Arizona or your school.
        Schools remain responsible for their own policies and compliance decisions.
      </p>
    </article>
  );
}
