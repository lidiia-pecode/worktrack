import { requireManagerAccess } from "@/lib/api/server/auth";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { ReportsView } from "@/app/components/reports/ReportsView";

export default async function ReportsPage() {
  await requireManagerAccess();

  return (
    <section className="flex min-h-full w-full flex-col p-6">
      <PageHeader
        title="Reports"
        description="Where logged time went, and how it compares with the plan."
      />

      <ReportsView />
    </section>
  );
}
