import { requireManagerAccess } from "@/lib/api/server/auth";
import { EntityPanelProvider } from "@/app/components/entity-panel/EntityPanelProvider";
import { UsersContent } from "@/app/components/users/UsersContent";

export default async function UsersAdminPage() {
  await requireManagerAccess();

  return (
    <EntityPanelProvider>
      <UsersContent />
    </EntityPanelProvider>
  );
}
