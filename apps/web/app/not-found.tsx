import Link from "next/link";
import { ProductNotFoundState } from "@/components/public/page-states";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col gap-4">
      <ProductNotFoundState />
      <p className="text-muted">
        That address is not a public product, search, or rules page.
      </p>
      <Button asChild variant="ghost">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
