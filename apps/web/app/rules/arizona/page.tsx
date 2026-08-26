const sources = [
  {
    title: "A.R.S. § 15-242.01",
    href: "https://www.azleg.gov/ars/15/00242-01.htm",
    kind: "Statute",
  },
  {
    title: "Arizona Laws 2025, Chapter 52 / HB 2164",
    href: "https://www.azleg.gov/legtext/57Leg/1R/laws/0052.pdf",
    kind: "Statute",
  },
  {
    title: "ADE May 5, 2026 compliance memorandum",
    href: "https://www.azed.gov/sites/default/files/2026/05/Arizona%20Healthy%20Schools%20Act.pdf",
    kind: "Agency guidance",
  },
  {
    title: "ADE May 2026 administrator resource and FAQ",
    href: "https://www.azed.gov/sites/default/files/2026/01/The%20Basics%20of%20the%20Arizona%20Healthy%20Schools%20Act%20Resource%20for%20School%20Administrators.pdf",
    kind: "Agency guidance",
  },
];

export default function ArizonaRulesPage() {
  return (
    <article className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-3xl font-semibold">Arizona Healthy Schools Act</h1>
      <p>
        Beginning with the 2026–27 school year, A.R.S. § 15-242.01 restricts covered
        ultraprocessed food at schools that participate in a federally funded or assisted
        meal program. The statute names 11 ingredients.
      </p>
      <p>
        ADE’s May 2026 guidance states that compliance is campus-wide and includes
        classroom-based food distribution. The statute itself also says a parent or
        guardian may still provide covered food to that parent’s own student. This
        application keeps those sources distinct.
      </p>
      <p>
        Passing the Arizona ingredient check is not a school-policy approval, an allergy
        determination, or a nutrition grade.
      </p>
      <section>
        <h2 className="text-2xl font-semibold">Primary sources</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          {sources.map((source) => (
            <li key={source.href}>
              <span className="text-muted text-sm font-semibold uppercase tracking-wide">
                {source.kind}
              </span>
              <br />
              <a href={source.href} className="font-medium underline underline-offset-2">
                {source.title}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
