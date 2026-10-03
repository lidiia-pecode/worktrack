import { requireManagerAccess } from "@/lib/api/server/auth";
import { UserRole } from "@/types/enums";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { TeamTimeView } from "@/app/components/team/TeamTimeView";
import { ManagerWelcome } from "@/app/components/team/components/ManagerWelcome";

export default async function TeamPage() {
  const user = await requireManagerAccess();

  return (
    <>
      <PageHeader
        title="Team time"
        description="See who logged time this week, how much, and where it went."
      />

      {user.role === UserRole.MANAGER && (
        <ManagerWelcome userId={user.id} firstName={user.firstName} />
      )}

      <TeamTimeView role={user.role} viewerId={user.id} />
    </>
  );
}
