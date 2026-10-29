import { requireOwnerAccess } from "@/lib/api/server/auth";
import { EntityPanelProvider } from "@/app/components/entity-panel/EntityPanelProvider";
import { ActivitiesContent } from "@/app/components/activities/ActivitiesContent";

export default async function ActivitiesAdminPage() {
  await requireOwnerAccess();

  return (
    <EntityPanelProvider>
      <ActivitiesContent />
    </EntityPanelProvider>
  );
}
