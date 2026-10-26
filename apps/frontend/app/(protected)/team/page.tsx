import { requireManagerAccess } from "@/lib/api/server/auth";
import { UserRole } from "@/types/enums";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { TeamTimeView } from "@/app/components/team/TeamTimeView";
import { ManagerWelcome } from "@/app/components/team/components/ManagerWelcome";

type TeamPageProps = {
  /** `week`: any day of the week to open, as on the timesheet. */
  searchParams: Promise<{ week?: string }>;
};

export default async function TeamPage({ searchParams }: TeamPageProps) {
  const user = await requireManagerAccess();
  const { week } = await searchParams;

  return (
    <>
      <PageHeader title="Team time" hideTitle />

      {user.role === UserRole.MANAGER && (
        <ManagerWelcome userId={user.id} firstName={user.firstName} />
      )}

      <TeamTimeView
        // A new link starts from its own week, even while on Team time.
        key={week}
        role={user.role}
        viewerId={user.id}
        startingDay={week}
      />
    </>
  );
}
