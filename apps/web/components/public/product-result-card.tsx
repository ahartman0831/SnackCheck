import Link from "next/link";
import type { PublicProductCard } from "@snackcheck/contracts";
import { FreshnessBadge } from "@/components/ui/freshness-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatEvidenceDate } from "@/lib/products/discovery";

export function ProductResultCard({ item }: { item: PublicProductCard }) {
  const detail = [item.variant, item.size].filter(Boolean).join(" · ");
  const evidenceDate = formatEvidenceDate(item.evidenceObservedAt ?? item.lastVerifiedAt);
  return (
    <article className="border-border bg-surface min-w-0 rounded-[20px] border p-4 shadow-[var(--highlight)]">
      <Link
        href={`/product/${item.slug}`}
        className="flex min-h-20 min-w-0 items-center gap-4"
      >
        <div className="bg-surface-strong text-muted flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-[14px] text-xs font-semibold">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt="" className="size-full object-cover" />
          ) : (
            item.brand.slice(0, 1)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-muted text-sm">{item.brand}</p>
          <h3 className="truncate text-lg font-semibold">{item.name}</h3>
          {detail ? <p className="text-muted truncate text-sm">{detail}</p> : null}
          {item.individuallyPackaged === true ? (
            <p className="text-muted mt-1 text-xs font-semibold">Individually packaged</p>
          ) : null}
        </div>
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
        <StatusBadge status={item.ingredientStatus} />
        {item.verificationStatus ? (
          <span className="text-muted font-mono text-xs">{item.verificationStatus}</span>
        ) : null}
        <FreshnessBadge state={item.freshnessState} />
      </div>
      {evidenceDate || item.evidenceTitle ? (
        <p className="text-muted mt-2 text-xs">
          {evidenceDate ? `Evidence checked ${evidenceDate}` : "Evidence reviewed"}
          {item.evidenceTitle ? (
            <>
              {" · "}
              {item.evidenceUrl ? (
                <a
                  href={item.evidenceUrl}
                  rel="noreferrer"
                  target="_blank"
                  className="font-semibold underline underline-offset-2"
                >
                  {item.evidenceTitle}
                </a>
              ) : (
                item.evidenceTitle
              )}
            </>
          ) : null}
        </p>
      ) : null}
    </article>
  );
}
