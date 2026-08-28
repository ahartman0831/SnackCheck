import { notFound } from "next/navigation";
import { BookOpen, ScanLine } from "lucide-react";
import { isDevUiEnabled } from "@/lib/products/lookup-policy";
import { LogoMark, LogoMono, Wordmark } from "@/components/brand/logo";
import { Accordion } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FreshnessBadge } from "@/components/ui/freshness-badge";
import { IconButton } from "@/components/ui/icon-button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs } from "@/components/ui/tabs";
import { Tooltip } from "@/components/ui/tooltip";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "UI gallery",
  robots: { index: false, follow: false },
};

export default function DevUiPage() {
  if (!isDevUiEnabled(process.env.NODE_ENV)) {
    notFound();
  }

  return (
    <div className="flex min-w-0 flex-col gap-10">
      <header className="brand-grid brand-noise rounded-[20px] p-5">
        <p className="text-accent text-sm font-semibold uppercase tracking-[0.16em]">
          Development only
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          SnackCheck UI gallery
        </h1>
        <p className="text-muted mt-2 max-w-2xl">
          Visual foundation for Phase 4. This route is unavailable in production.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Wordmark />
          <LogoMark />
          <LogoMono className="text-foreground" />
        </div>
      </header>

      <section className="flex min-w-0 flex-col gap-3">
        <h2 className="text-xl font-semibold">Buttons and fields</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button disabled>Disabled</Button>
          <IconButton label="Scan sample">
            <ScanLine className="size-5" />
          </IconButton>
        </div>
        <Field id="upc" label="UPC" hint="Tabular numbers for codes and dates.">
          <Input id="upc" className="font-mono" defaultValue="036000291452" />
        </Field>
        <Field
          id="notes"
          label="Notes"
          error="This field is required and cannot be invented."
        >
          <Textarea id="notes" aria-invalid defaultValue="" />
        </Field>
      </section>

      <section className="flex min-w-0 flex-col gap-3">
        <h2 className="text-xl font-semibold">Status and freshness</h2>
        <p className="text-muted text-sm">
          Status never relies on color alone. Each badge includes an icon and a text
          label.
        </p>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status="PASS" />
          <StatusBadge status="FAIL" />
          <StatusBadge status="VERIFY" />
          <FreshnessBadge state="CURRENT" />
          <FreshnessBadge state="AGING" />
          <FreshnessBadge state="STALE" />
          <Badge>Neutral</Badge>
        </div>
      </section>

      <section className="grid min-w-0 gap-3 md:grid-cols-2">
        <Card>
          <CardTitle>Representative product card</CardTitle>
          <p className="text-muted mt-1 text-sm">North Mesa</p>
          <p className="text-lg font-semibold">Plain Oat Bars</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge status="PASS" />
            <FreshnessBadge state="CURRENT" />
          </div>
          <p className="text-muted mt-3 font-mono text-xs">2026-08-01 · hash 9f3a…c21</p>
        </Card>
        <Card>
          <CardTitle>Loading and empty</CardTitle>
          <div className="mt-3 flex flex-col gap-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <EmptyState
              title="No verified passing products"
              description="Approved browsing stays empty until a published ruleset and current PASS evidence exist."
              action={<Button variant="secondary">Read Arizona rules</Button>}
            />
          </div>
        </Card>
      </section>

      <section className="flex min-w-0 flex-col gap-3">
        <h2 className="text-xl font-semibold">Overlay and structure</h2>
        <Tabs
          defaultValue="desktop"
          tabs={[
            {
              value: "desktop",
              label: "Desktop shell",
              content: (
                <Card>
                  Wordmark, Search, What I can bring, Scan, Arizona rules, and theme
                  control.
                </Card>
              ),
            },
            {
              value: "mobile",
              label: "Mobile shell",
              content: (
                <Card>
                  Fixed Home / Search / Scan / Browse / Rules bar with a prominent central
                  Scan action and safe-area inset.
                </Card>
              ),
            },
          ]}
        />
        <Accordion
          items={[
            {
              value: "copy",
              title: "Long-copy stress",
              content:
                "SnackCheck is a high-trust scanner utility, not a government form and not a clinical record. Parents get PASS, FAIL, or VERIFY from a deterministic engine. This sentence is intentionally long so 200% zoom and 320px layouts can be inspected without overflow.",
            },
          ]}
        />
        <Progress value={64} label="Evidence review" />
        <div className="flex flex-wrap gap-3">
          <Dialog
            trigger={<Button variant="secondary">Open dialog</Button>}
            title="Confirm this package"
            description="AI never decides PASS, FAIL, or VERIFY."
          >
            <p className="text-sm">
              Compare the label to the stored formulation before you continue.
            </p>
          </Dialog>
          <Tooltip content="Arizona sources stay public">
            <Button variant="ghost">
              <BookOpen className="size-4" aria-hidden />
              Tooltip target
            </Button>
          </Tooltip>
        </div>
      </section>
    </div>
  );
}
