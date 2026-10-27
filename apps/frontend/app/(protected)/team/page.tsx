import { requireManagerAccess } from "@/lib/api/server/auth";
import { UserRole } from "@/types/enums";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { TeamTimeView } from "@/app/components/team/TeamTimeView";
import { ManagerWelcome } from "@/app/components/team/components/ManagerWelcome";
import { PERSON_PARAM } from "@/app/components/team/team-links";

type TeamPageProps = {
  searchParams: Promise<{ [PERSON_PARAM]?: string }>;
};

export default async function TeamPage({ searchParams }: TeamPageProps) {
  const user = await requireManagerAccess();
  const { [PERSON_PARAM]: highlightedPersonId } = await searchParams;

  return (
    <>
      <PageHeader title="Team time" hideTitle />

      {user.role === UserRole.MANAGER && (
        <ManagerWelcome userId={user.id} firstName={user.firstName} />
      )}

      <TeamTimeView
        role={user.role}
        viewerId={user.id}
        highlightedPersonId={highlightedPersonId}
      />
    </>
  );
}
