import { createUserServerClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createUserServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-semibold">Operations</h1>
      <p className="text-muted">
        {user
          ? "Signed in. Role checks still happen on every mutation."
          : "No parent signup. Admins sign in with a magic link after they are allowlisted in admin_members."}
      </p>
      <ul className="text-muted list-disc pl-5">
        <li>Pending submissions</li>
        <li>Conflicts</li>
        <li>Failed or low-confidence extractions</li>
        <li>Stale formulations</li>
        <li>Top zero-result searches</li>
        <li>Recent ruleset changes</li>
      </ul>
    </div>
  );
}
