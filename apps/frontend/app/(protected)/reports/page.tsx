import { requireManagerAccess } from "@/lib/api/server/auth";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { HoursReportView } from "@/app/components/reports/HoursReportView";

export default async function ReportsPage() {
  await requireManagerAccess();

  return (
    <section className="flex min-h-full w-full flex-col p-6">
      <PageHeader
        title="Reports"
        description="Where logged time went, split into billable client work, non-billable client work and internal work."
      />

      <HoursReportView />
    </section>
  );
}
