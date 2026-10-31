"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { SecondaryAuthLayout } from "@/app/components/auth/components/SecondaryAuthLayout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface StandaloneNoticeProps {
  title: string;
  message: string;
  /** An action offered before the way home, which then turns secondary. */
  action?: ReactNode;
}

/**
 * A full-page notice in the sign-in pages' look, for pages shown without the
 * shell. It always ends with a link to `/`, which routes each role onward.
 */
export const StandaloneNotice = ({
  title,
  message,
  action,
}: StandaloneNoticeProps) => (
  <SecondaryAuthLayout>
    <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
      {title}
    </h1>

    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
      {message}
    </p>

    <div className="mt-7 flex flex-col gap-3">
      {action}

      <Link
        href="/"
        className={cn(
          buttonVariants({ variant: action ? "outline" : "primary" }),
          "w-full",
        )}
      >
        Go to WorkTrack
      </Link>
    </div>
  </SecondaryAuthLayout>
);
