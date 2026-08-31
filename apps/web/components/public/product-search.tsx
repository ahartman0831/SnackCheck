"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { PublicProductCard } from "@snackcheck/contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductResultCard } from "@/components/public/product-result-card";
import {
  OfflineState,
  SearchEmptyState,
  ServerErrorState,
} from "@/components/public/page-states";
import { barcodeActionLabel, ingredientActionLabel } from "@/lib/public-copy";

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export function ProductSearch({
  initialQuery = "",
  initialResults = [],
  autoFocus = false,
  live = false,
  showAlternatives = true,
}: {
  initialQuery?: string;
  initialResults?: PublicProductCard[];
  autoFocus?: boolean;
  live?: boolean;
  showAlternatives?: boolean;
}) {
  const router = useRouter();
  const listId = useId();
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<PublicProductCard[]>(initialResults);
  const [status, setStatus] = useState<"idle" | "loading" | "empty" | "error">(
    initialResults.length === 0 && initialQuery.trim().length >= 2 ? "empty" : "idle",
  );
  const [retryToken, setRetryToken] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const trimmed = query.trim();
  const tooShort = trimmed.length < 2;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!live || tooShort || !online) {
      abortRef.current?.abort();
      return;
    }
    const handle = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      if (!mountedRef.current) return;
      setStatus("loading");
      fetch(`/api/v1/search?q=${encodeURIComponent(trimmed)}&limit=10`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("search failed");
          const body = await response.json();
          const rows = (body.data ?? []) as PublicProductCard[];
          if (!mountedRef.current) return;
          setResults(rows);
          setActiveIndex(-1);
          setStatus(rows.length === 0 ? "empty" : "idle");
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          if (!mountedRef.current) return;
          setStatus("error");
        });
    }, 250);
    return () => {
      window.clearTimeout(handle);
      abortRef.current?.abort();
    };
  }, [live, online, tooShort, trimmed, retryToken]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    if (tooShort) {
      event.preventDefault();
      return;
    }
    if (live) {
      event.preventDefault();
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  }

  const visibleResults = tooShort ? [] : results;
  const showOffline = live && !online && !tooShort;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <form
        role="search"
        action="/search"
        method="get"
        onSubmit={submit}
        className="flex min-w-0 flex-col gap-3"
      >
        <label htmlFor="food-search" className="sr-only">
          Search a food or brand
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            id="food-search"
            name="q"
            type="search"
            role="combobox"
            aria-expanded={live && visibleResults.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            value={query}
            autoFocus={autoFocus}
            autoComplete="off"
            enterKeyHint="search"
            placeholder="Search a food or brand"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (!live || visibleResults.length === 0) return;
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((index) => Math.min(index + 1, visibleResults.length - 1));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) => Math.max(index - 1, 0));
              }
              if (
                event.key === "Enter" &&
                activeIndex >= 0 &&
                visibleResults[activeIndex]
              ) {
                event.preventDefault();
                router.push(`/product/${visibleResults[activeIndex].slug}`);
              }
            }}
            className="min-h-14 text-base"
          />
          <Button type="submit" size="lg">
            Search products
          </Button>
        </div>
      </form>

      {live && query.trim().length === 1 ? (
        <p className="text-muted text-sm">Type at least two characters.</p>
      ) : null}
      {showOffline ? <OfflineState /> : null}
      {status === "loading" && !tooShort && online ? (
        <div className="flex flex-col gap-2" aria-busy="true" aria-live="polite">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : null}
      {status === "error" && !tooShort && online ? (
        <ServerErrorState onRetry={() => setRetryToken((value) => value + 1)} />
      ) : null}
      {status === "empty" && !tooShort && online && !showOffline ? (
        <SearchEmptyState query={trimmed} />
      ) : null}
      {live && status !== "loading" && visibleResults.length > 0 ? (
        <ul id={listId} role="listbox" className="grid gap-3">
          {visibleResults.map((item, index) => (
            <li key={item.id} role="option" aria-selected={index === activeIndex}>
              <ProductResultCard item={item} />
            </li>
          ))}
        </ul>
      ) : null}
      {showAlternatives ? (
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="secondary">
            <Link href="/scan/barcode">{barcodeActionLabel()}</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/scan/ingredients">{ingredientActionLabel()}</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
