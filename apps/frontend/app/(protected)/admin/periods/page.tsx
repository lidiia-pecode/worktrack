import { requireOwnerAccess } from "@/lib/api/server/auth";
import { GRACE_DAYS } from "@/lib/utils/reporting-period";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { PeriodsContent } from "@/app/components/periods/PeriodsContent";

export default async function PeriodsPage() {
  await requireOwnerAccess();

  return (
    <>
      <PageHeader
        title="Periods"
        description={`Each month locks by itself ${GRACE_DAYS} days after it ends. Reopen a locked month to correct it, then close it again.`}
      />

      <PeriodsContent />
    </>
  );
}
