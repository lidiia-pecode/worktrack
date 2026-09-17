import { requireManagerAccess } from "@/lib/api/server/auth";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { TeamTimeView } from "@/app/components/team/TeamTimeView";

export default async function TeamPage() {
  await requireManagerAccess();

  return (
    <section className="flex min-h-full w-full flex-col p-6">
      <PageHeader
        title="Team time"
        description="See who logged time this week, how much, and where it went."
      />

      <TeamTimeView />
    </section>
  );
}
