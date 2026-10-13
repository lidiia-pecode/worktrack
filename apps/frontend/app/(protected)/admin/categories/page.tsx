import { requireManagerAccess } from "@/lib/api/server/auth";
import { EntityPanelProvider } from "@/app/components/entity-panel/EntityPanelProvider";
import { ActivityCategoriesContent } from "@/app/components/categories/ActivityCategoriesContent";

export default async function ActivityCategoriesAdminPage() {
  await requireManagerAccess();

  return (
    <EntityPanelProvider>
      <ActivityCategoriesContent />
    </EntityPanelProvider>
  );
}
