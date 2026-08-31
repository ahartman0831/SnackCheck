import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { barcodeActionLabel, ingredientActionLabel } from "@/lib/public-copy";

export function PageState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <EmptyState
      title={title}
      description={description}
      action={action}
      headingLevel="h1"
    />
  );
}

export function SearchEmptyState({ query }: { query?: string }) {
  const requestParams = new URLSearchParams({ request: "product" });
  if (query) requestParams.set("q", query.slice(0, 80));
  return (
    <PageState
      title="No products matched that search"
      description="Nothing was invented. You can enter a barcode or paste the ingredient list from the package."
      action={
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="secondary">
            <Link href="/scan/barcode">{barcodeActionLabel()}</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/scan/ingredients">{ingredientActionLabel()}</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href={`/scan/ingredients?${requestParams.toString()}`}>
              Request this product
            </Link>
          </Button>
        </div>
      }
    />
  );
}

export function UnavailableRulesetState() {
  return (
    <PageState
      title="Arizona ruleset is under review"
      description="SnackCheck will not treat a development fixture as current law. Primary sources remain available while the published ruleset is unsigned."
      action={
        <Button asChild variant="secondary">
          <Link href="/rules/arizona">Read the Arizona sources</Link>
        </Button>
      }
    />
  );
}

export function OfflineState() {
  return (
    <PageState
      title="You are offline"
      description="A cached PASS is not shown as current. Reconnect to check a package against the published ruleset."
      action={
        <Button asChild variant="secondary">
          <Link href="/">Back to home</Link>
        </Button>
      }
    />
  );
}

export function ServerErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <PageState
      title="This check is unavailable"
      description="The live catalog or rules service could not be reached. No product was invented."
      action={
        onRetry ? (
          <Button type="button" onClick={onRetry}>
            Try again
          </Button>
        ) : (
          <Button asChild>
            <Link href="/search">Try search again</Link>
          </Button>
        )
      }
    />
  );
}

export function ProductNotFoundState() {
  return (
    <PageState
      title="That product is not published"
      description="SnackCheck does not invent a record when a product is missing."
      action={
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/search">Search products</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/scan/ingredients">{ingredientActionLabel()}</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/scan/ingredients?request=product">Request this product</Link>
          </Button>
        </div>
      }
    />
  );
}

export function DisabledFeatureState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <PageState
      title={title}
      description={description}
      action={
        <Button asChild variant="secondary">
          <Link href="/">Back to home</Link>
        </Button>
      }
    />
  );
}
