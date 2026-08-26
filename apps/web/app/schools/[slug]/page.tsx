export default async function SchoolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-3xl font-semibold">School policy</h1>
      <p className="text-muted">
        School participation for <code>{slug}</code> is not verified. No unsourced policy
        is shown.
      </p>
    </div>
  );
}
