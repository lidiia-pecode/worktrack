import type { Metadata } from "next";
import { requireManagerAccess } from "@/lib/api/server/auth";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { ReportsView } from "@/app/components/reports/ReportsView";
import { reports } from "@/app/components/layout/sidebar/sidebar-navigation";

export const metadata: Metadata = { title: reports.label };

export default async function ReportsPage() {
  await requireManagerAccess();

  return (
    <>
      <PageHeader title="Reports" hideTitle />

      <ReportsView />
    </>
  );
}
