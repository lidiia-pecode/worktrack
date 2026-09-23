import { requireOwnerAccess } from "@/lib/api/server/auth";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { PeriodsContent } from "@/app/components/periods/PeriodsContent";

export default async function PeriodsPage() {
  await requireOwnerAccess();

  return (
    <section className="flex min-h-full w-full flex-col p-6">
      <PageHeader
        title="Periods"
        description="Each month locks by itself 7 days after it ends. Reopen a locked month to correct it, then close it again."
      />

      <PeriodsContent />
    </section>
  );
}
