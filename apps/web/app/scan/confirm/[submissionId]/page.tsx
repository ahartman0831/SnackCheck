import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Confirm extraction",
};

export default async function ConfirmPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-3xl font-semibold">Confirm extraction</h1>
      <p className="text-muted">
        Submission {submissionId} is private. Confirm the text on the ingredient scan
        page. This URL is not for sharing.
      </p>
    </div>
  );
}
