import { PageHeader } from "../../shared/PageHeader";

export const SetupSkeleton = () => (
  <section className="w-full max-w-3xl">
    <PageHeader title="Getting started" />
    <div className="h-40 animate-pulse rounded-xl border border-border bg-card" />
  </section>
);
