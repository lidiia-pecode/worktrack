import { requireManagerAccess } from "@/lib/api/server/auth";
import { TeamsContent } from "@/app/components/teams/TeamsContent";

export default async function TeamsAdminPage() {
  await requireManagerAccess();

  return <TeamsContent />;
}
