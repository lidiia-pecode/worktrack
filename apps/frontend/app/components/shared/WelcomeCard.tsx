"use client";

import { useId } from "react";
import Link from "next/link";
import { ArrowRight, Hand, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDismissible } from "@/hooks/useDismissible";
import { cn } from "@/lib/utils/cn";

export interface WelcomeItem {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Another page the item leads to; the page in view has none. */
  href?: string;
}

interface WelcomeCardProps {
  dismissKey: string;
  firstName: string;
  status: string;
  items: WelcomeItem[];
  className?: string;
}

export const WelcomeCard = ({
  dismissKey,
  firstName,
  status,
  items,
  className,
}: WelcomeCardProps) => {
  const { isDismissed, dismiss } = useDismissible(dismissKey);
  const titleId = useId();

  if (isDismissed) return null;

  return (
    <Card
      as="section"
      aria-labelledby={titleId}
      className={cn("p-4 sm:p-5", className)}
    >
      <div className="flex items-center gap-3">
        <Hand
          className="size-5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />

        <div className="min-w-0">
          <h2 id={titleId} className="text-base font-semibold text-foreground">
            Welcome, {firstName}
          </h2>

          <p className="text-sm text-muted-foreground">{status}</p>
        </div>
      </div>

      <ul className="mt-4 grid gap-2 md:grid-cols-3">
        {items.map((item) => (
          <li key={item.title} className="flex">
            {item.href ? (
              <Link
                href={item.href}
                className={cn(
                  ITEM_CLASS,
                  "transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <ItemContent item={item} />
              </Link>
            ) : (
              <div className={ITEM_CLASS}>
                <ItemContent item={item} />
              </div>
            )}
          </li>
        ))}
      </ul>

      <Button
        variant="pastel"
        type="button"
        className="mt-4 w-full"
        onClick={dismiss}
      >
        Got it
      </Button>
    </Card>
  );
};

const ITEM_CLASS =
  "flex w-full gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5";

const ItemContent = ({
  item: { icon: Icon, title, description, href },
}: {
  item: WelcomeItem;
}) => (
  <>
    <Icon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />

    <div className="min-w-0">
      <h3 className="flex items-center gap-1 text-sm font-medium text-foreground">
        {title}
        {href && (
          <ArrowRight className="size-3.5 text-brand" aria-hidden="true" />
        )}
      </h3>

      <p className="text-sm leading-5 text-muted-foreground">{description}</p>
    </div>
  </>
);
