export default function PrivacyPage() {
  return (
    <article className="flex max-w-3xl flex-col gap-4">
      <h1 className="text-3xl font-semibold">Privacy</h1>
      <p>
        Parents do not need an account. The public application does not collect precise
        location, and ingredient photos are stripped of EXIF before review or model input.
      </p>
      <p>
        Analytics, when enabled, use allowlisted event names and a daily rotating
        anonymous key. Raw IP addresses are not stored.
      </p>
    </article>
  );
}
