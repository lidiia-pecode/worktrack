import { requireManagerAccess } from "@/lib/api/server/auth";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { PlanningWeekView } from "@/app/components/planning/PlanningWeekView";

export default async function PlanningPage() {
  const user = await requireManagerAccess();

  return (
    <>
      <PageHeader
        title="Planning"
        description="Plan your team's week by project. Plans are guidance, never a limit on logged time."
      />

      <PlanningWeekView role={user.role} viewerId={user.id} />
    </>
  );
}
