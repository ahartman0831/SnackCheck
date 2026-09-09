type StagingApplySafetyInput = {
  argv: string[];
  confirmation: string;
  url: string;
};

type StagingRuntimeSafetyInput = {
  url: string;
  vercelEnvironment: string | undefined;
};

function option(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

function projectRefFromUrl(value: string): string {
  const hostname = new URL(value).hostname;
  const suffix = ".supabase.co";
  if (!hostname.endsWith(suffix)) throw new Error("The Supabase URL is invalid.");
  return hostname.slice(0, -suffix.length);
}

export function assertStagingApplySafety({
  argv,
  confirmation,
  url,
}: StagingApplySafetyInput): void {
  if (option(argv, "--target") !== "staging") {
    throw new Error("Apply requires --target staging.");
  }
  if (option(argv, "--confirm") !== confirmation) {
    throw new Error(`Apply requires --confirm ${confirmation}.`);
  }
  if (process.env.VERCEL_ENV === "production") {
    throw new Error(
      "Catalog operations are forbidden in the production Vercel environment.",
    );
  }

  const projectRef = projectRefFromUrl(url);
  const production = process.env.CATALOG_PRODUCTION_SUPABASE_PROJECT_REF ?? "";
  if (production && production === projectRef) {
    throw new Error(
      "Catalog operations are forbidden for the production Supabase project.",
    );
  }

  const designated = process.env.CATALOG_STAGING_SUPABASE_PROJECT_REF ?? "";
  const configured = process.env.SUPABASE_PROJECT_ID ?? "";
  if (!designated || designated !== projectRef || configured !== projectRef) {
    throw new Error(
      "Apply requires both staging project references to match the target URL.",
    );
  }
}

export function assertStagingRuntimeSafety({
  url,
  vercelEnvironment,
}: StagingRuntimeSafetyInput): void {
  if (vercelEnvironment !== "preview") {
    throw new Error("Catalog AI operations are available only in a Vercel preview.");
  }

  const projectRef = projectRefFromUrl(url);
  const production = process.env.CATALOG_PRODUCTION_SUPABASE_PROJECT_REF ?? "";
  if (production && production === projectRef) {
    throw new Error(
      "Catalog AI operations are forbidden for the production Supabase project.",
    );
  }

  const designated = process.env.CATALOG_STAGING_SUPABASE_PROJECT_REF ?? "";
  const configured = process.env.SUPABASE_PROJECT_ID ?? "";
  if (!designated || designated !== projectRef || configured !== projectRef) {
    throw new Error(
      "Catalog AI operations require both staging project references to match the target URL.",
    );
  }
}
