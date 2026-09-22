import { requireManagerAccess } from "@/lib/api/server/auth";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { PlanningWeekView } from "@/app/components/planning/PlanningWeekView";

export default async function PlanningPage() {
  const user = await requireManagerAccess();

  return (
    <section className="flex min-h-full w-full flex-col p-6">
      <PageHeader
        title="Planning"
        description="Plan your team's week by project. Plans are guidance, never a limit on logged time."
      />

      <PlanningWeekView role={user.role} />
    </section>
  );
}
