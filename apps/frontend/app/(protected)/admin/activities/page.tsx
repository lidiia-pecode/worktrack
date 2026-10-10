import { requireManagerAccess } from "@/lib/api/server/auth";
import { EntityPanelProvider } from "@/app/components/entity-panel/EntityPanelProvider";
import { ActivitiesContent } from "@/app/components/activities/ActivitiesContent";

export default async function ActivitiesAdminPage() {
  await requireManagerAccess();

  return (
    <EntityPanelProvider>
      <ActivitiesContent />
    </EntityPanelProvider>
  );
}
