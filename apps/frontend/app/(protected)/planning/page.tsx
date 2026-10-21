import { requireManagerAccess } from "@/lib/api/server/auth";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { PlanningWeekView } from "@/app/components/planning/PlanningWeekView";

export default async function PlanningPage() {
  const user = await requireManagerAccess();

  return (
    <>
      <PageHeader title="Planning" hideTitle />

      <PlanningWeekView role={user.role} viewerId={user.id} />
    </>
  );
}
