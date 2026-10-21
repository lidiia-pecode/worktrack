import { requireManagerAccess } from "@/lib/api/server/auth";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { ReportsView } from "@/app/components/reports/ReportsView";

export default async function ReportsPage() {
  await requireManagerAccess();

  return (
    <>
      <PageHeader title="Reports" hideTitle />

      <ReportsView />
    </>
  );
}
