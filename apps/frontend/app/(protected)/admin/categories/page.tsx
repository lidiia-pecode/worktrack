import type { Metadata } from "next";
import { requireOwnerAccess } from "@/lib/api/server/auth";
import { EntityPanelProvider } from "@/app/components/entity-panel/EntityPanelProvider";
import { ActivityCategoriesContent } from "@/app/components/categories/ActivityCategoriesContent";
import { categories } from "@/app/components/layout/sidebar/sidebar-navigation";

export const metadata: Metadata = { title: categories.label };

export default async function ActivityCategoriesAdminPage() {
  await requireOwnerAccess();

  return (
    <EntityPanelProvider>
      <ActivityCategoriesContent />
    </EntityPanelProvider>
  );
}
