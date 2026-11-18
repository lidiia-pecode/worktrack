import type { Metadata } from "next";
import { requireManagerAccess } from "@/lib/api/server/auth";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { PlanningView } from "@/app/components/planning/PlanningView";
import { planning } from "@/app/components/layout/sidebar/sidebar-navigation";

export const metadata: Metadata = { title: planning.label };

export default async function PlanningPage() {
  const user = await requireManagerAccess();

  return (
    <>
      <PageHeader title="Planning" hideTitle />

      <PlanningView role={user.role} viewerId={user.id} />
    </>
  );
}
