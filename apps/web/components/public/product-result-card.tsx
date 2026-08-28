import Link from "next/link";
import type { PublicProductCard } from "@snackcheck/contracts";
import { FreshnessBadge } from "@/components/ui/freshness-badge";
import { StatusBadge } from "@/components/ui/status-badge";

export function ProductResultCard({ item }: { item: PublicProductCard }) {
  const detail = [item.variant, item.size].filter(Boolean).join(" · ");
  return (
    <Link
      href={`/product/${item.slug}`}
      className="border-border bg-surface flex min-h-20 min-w-0 items-center gap-4 rounded-[20px] border p-4 shadow-[var(--highlight)]"
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
        <p className="truncate text-lg font-semibold">{item.name}</p>
        {detail ? <p className="text-muted truncate text-sm">{detail}</p> : null}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={item.ingredientStatus} />
          {item.verificationStatus ? (
            <span className="text-muted font-mono text-xs">
              {item.verificationStatus}
            </span>
          ) : null}
          <FreshnessBadge state={item.freshnessState} />
        </div>
      </div>
    </Link>
  );
}
