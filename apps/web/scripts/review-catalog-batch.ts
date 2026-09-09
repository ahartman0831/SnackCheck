/** Read-only final stage of a catalog batch: uses stored records; no provider calls or approval writes. */
import { readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@snackcheck/db-types";
import {
  buildCatalogReviewPacket,
  REVIEW_EVIDENCE_COLUMNS,
} from "../lib/catalog-evidence/review-packet";
const Manifest = z
  .object({ candidateIds: z.array(z.string().uuid()).min(1).max(100) })
  .strict()
  .refine(
    (value) => new Set(value.candidateIds).size === value.candidateIds.length,
    "Candidate IDs must be unique",
  );
function option(name: string) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value || value.startsWith("--")) throw new Error(`${name} is required`);
  return value;
}
async function main() {
  const manifestBytes = await readFile(option("--manifest"));
  if (manifestBytes.byteLength > 16000)
    throw new Error("Manifest exceeds the size limit");
  const manifest = Manifest.parse(JSON.parse(manifestBytes.toString("utf8")));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ref = process.env.CATALOG_STAGING_SUPABASE_PROJECT_REF;
  if (!url || !key || !ref || new URL(url).hostname !== `${ref}.supabase.co`)
    throw new Error("The configured staging project and credentials are required");
  const admin = createClient<Database>(url, key, { auth: { persistSession: false } });
  const [candidates, evidence] = await Promise.all([
    admin
      .from("catalog_source_records")
      .select(
        "id,brand,product_name,normalized_gtin14,raw_ingredient_text,source_url,license_identifier,source_modified_at,screen_status,ruleset_hash,engine_version,candidate_state",
      )
      .in("id", manifest.candidateIds),
    admin
      .from("catalog_evidence_attempts")
      .select(REVIEW_EVIDENCE_COLUMNS, { count: "exact" })
      .in("candidate_id", manifest.candidateIds)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1000),
  ]);
  if (candidates.error || evidence.error)
    throw new Error("The staging batch could not be read");
  if (candidates.data.length !== manifest.candidateIds.length)
    throw new Error("Every requested candidate must exist");
  if (evidence.count === null || evidence.count > 1000)
    throw new Error("Evidence history is too large; use a smaller manifest");
  const byId = new Map(candidates.data.map((row) => [row.id, row]));
  const packets = manifest.candidateIds.map((id) => {
    const candidate = byId.get(id)!;
    return {
      candidate,
      ...buildCatalogReviewPacket(
        {
          id,
          gtin14: candidate.normalized_gtin14,
          rawIngredientText: candidate.raw_ingredient_text,
        },
        evidence.data,
      ),
    };
  });
  const nextSteps: Record<string, number> = {};
  for (const packet of packets)
    nextSteps[packet.nextStep] = (nextSteps[packet.nextStep] ?? 0) + 1;
  const summary = {
    reviewOnly: true,
    generatedAt: new Date().toISOString(),
    candidateCount: packets.length,
    candidatesWithIngredientEvidence: packets.filter((packet) =>
      packet.sources.some((source) => source.ingredientText),
    ).length,
    candidatesWithoutAttempts: packets.filter(
      (packet) => !packet.sources.length && !packet.attemptsWithoutSource.length,
    ).length,
    nextSteps,
    databaseWrites: 0,
    providerRequests: 0,
    paidAiCalls: 0,
  };
  await writeFile(
    option("--output"),
    JSON.stringify({ ...summary, packets }, null, 2) + "\n",
    { mode: 0o600 },
  );
  console.log(JSON.stringify(summary, null, 2));
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Batch review failed");
  process.exitCode = 1;
});
