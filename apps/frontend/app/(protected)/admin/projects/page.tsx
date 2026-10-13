import { requireManagerAccess } from "@/lib/api/server/auth";
import { EntityPanelProvider } from "@/app/components/entity-panel/EntityPanelProvider";
import { ProjectsContent } from "@/app/components/projects/ProjectContent";

export default async function ProjectsAdminPage() {
  await requireManagerAccess();

  return (
    <EntityPanelProvider>
      <ProjectsContent />
    </EntityPanelProvider>
  );
}
