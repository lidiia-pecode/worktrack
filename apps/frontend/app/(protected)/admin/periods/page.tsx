import { requireOwnerAccess } from "@/lib/api/server/auth";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { PeriodsContent } from "@/app/components/periods/PeriodsContent";

export default async function PeriodsPage() {
  await requireOwnerAccess();

  return (
    <>
      <PageHeader
        title="Periods"
        description="Each month locks by itself 7 days after it ends. Reopen a locked month to correct it, then close it again."
      />

      <PeriodsContent />
    </>
  );
}
