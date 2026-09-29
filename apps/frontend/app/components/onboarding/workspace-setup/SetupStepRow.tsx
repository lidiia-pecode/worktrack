import { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check, Lock, LucideIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export interface SetupStepItem {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  completed: boolean;
  locked?: boolean;
  keepsActionWhenDone?: boolean;
  link?: { label: string; href: string };
  extraAction?: ReactNode;
}

interface SetupStepRowProps {
  step: SetupStepItem;
  isCurrent: boolean;
}

export const SetupStepRow = ({ step, isCurrent }: SetupStepRowProps) => {
  const Icon = step.icon;
  const hasActions =
    !step.locked &&
    (!step.completed || step.keepsActionWhenDone) &&
    Boolean(step.link || step.extraAction);

  return (
    <li
      className={cn(
        "flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center",
        step.locked && "opacity-60",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            step.completed
              ? "bg-success/10 text-success-text"
              : step.locked
                ? "bg-muted text-muted-foreground"
                : "bg-brand-subtle text-brand",
          )}
        >
          {step.completed ? (
            <Check className="size-4.5" aria-hidden="true" />
          ) : step.locked ? (
            <Lock className="size-4" aria-hidden="true" />
          ) : (
            <Icon className="size-4.5" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "text-sm font-semibold",
              step.completed ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {step.title}
            <span className="sr-only">
              {step.completed ? " (done)" : step.locked ? " (not yet)" : ""}
            </span>
          </h3>

          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {step.description}
          </p>
        </div>
      </div>

      {hasActions && (
        <div className="flex shrink-0 items-center gap-2 pl-14 sm:pl-0">
          {step.extraAction}

          {step.link && (
            <Link
              href={step.link.href}
              className={cn(
                buttonVariants({
                  variant: isCurrent ? "primary" : "outline",
                  size: "sm",
                }),
              )}
            >
              {step.link.label}
              {isCurrent && <ArrowRight aria-hidden="true" />}
            </Link>
          )}
        </div>
      )}
    </li>
  );
};
