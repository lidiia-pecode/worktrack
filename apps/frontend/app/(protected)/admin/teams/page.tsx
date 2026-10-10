import { requireManagerAccess } from "@/lib/api/server/auth";
import { EntityPanelProvider } from "@/app/components/entity-panel/EntityPanelProvider";
import { TeamsContent } from "@/app/components/teams/TeamsContent";

export default async function TeamsAdminPage() {
  await requireManagerAccess();

  return (
    <EntityPanelProvider>
      <TeamsContent />
    </EntityPanelProvider>
  );
}
