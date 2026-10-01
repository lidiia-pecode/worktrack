"use client";

import { useId } from "react";
import { Hand, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDismissible } from "@/hooks/useDismissible";
import { cn } from "@/lib/utils/cn";

export interface WelcomeItem {
  icon: LucideIcon;
  title: string;
  description: string;
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
    <section
      aria-labelledby={titleId}
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-brand">
          <Hand className="size-4" aria-hidden="true" />
        </div>

        <div className="min-w-0">
          <h2 id={titleId} className="text-base font-semibold text-foreground">
            Welcome, {firstName}
          </h2>

          <p className="text-sm text-muted-foreground">{status}</p>
        </div>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {items.map(({ icon: Icon, title, description }) => (
          <li
            key={title}
            className="flex gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5"
          >
            <Icon
              className="mt-0.5 size-4 shrink-0 text-brand"
              aria-hidden="true"
            />

            <div className="min-w-0">
              <h3 className="text-sm font-medium text-foreground">{title}</h3>

              <p className="text-sm leading-5 text-muted-foreground">
                {description}
              </p>
            </div>
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
    </section>
  );
};
