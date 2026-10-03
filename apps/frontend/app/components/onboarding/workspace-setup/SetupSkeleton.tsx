import { Skeleton } from "@/components/ui/skeleton";

import { PageHeader } from "../../shared/PageHeader";

export const SetupSkeleton = () => (
  <section className="w-full max-w-3xl">
    <PageHeader title="Getting started" />
    <div role="status">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-40 rounded-xl border border-border bg-card" />
    </div>
  </section>
);
