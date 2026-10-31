import type { Metadata } from "next";
import { requireManagerAccess } from "@/lib/api/server/auth";
import { EntityPanelProvider } from "@/app/components/entity-panel/EntityPanelProvider";
import { UsersContent } from "@/app/components/users/UsersContent";
import { people } from "@/app/components/layout/sidebar/sidebar-navigation";

export const metadata: Metadata = { title: people.label };

export default async function UsersAdminPage() {
  await requireManagerAccess();

  return (
    <EntityPanelProvider>
      <UsersContent />
    </EntityPanelProvider>
  );
}
