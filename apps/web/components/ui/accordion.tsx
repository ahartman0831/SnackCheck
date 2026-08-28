"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

export function Accordion({
  items,
}: {
  items: Array<{ value: string; title: string; content: ReactNode }>;
}) {
  return (
    <AccordionPrimitive.Root type="single" collapsible className="flex flex-col gap-2">
      {items.map((item) => (
        <AccordionPrimitive.Item
          key={item.value}
          value={item.value}
          className="border-border bg-surface rounded-[16px] border"
        >
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger className="touch-target flex w-full items-center justify-between gap-3 px-4 text-left font-semibold">
              {item.title}
              <ChevronDown className="size-4 shrink-0" aria-hidden />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="text-muted px-4 pb-4 text-sm">
            {item.content}
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}
