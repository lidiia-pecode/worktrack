import type { Metadata } from "next";
import { requireManagerAccess } from "@/lib/api/server/auth";
import { EntityPanelProvider } from "@/app/components/entity-panel/EntityPanelProvider";
import { ProjectsContent } from "@/app/components/projects/ProjectContent";
import { projects } from "@/app/components/layout/sidebar/sidebar-navigation";

export const metadata: Metadata = { title: projects.label };

export default async function ProjectsAdminPage() {
  await requireManagerAccess();

  return (
    <EntityPanelProvider>
      <ProjectsContent />
    </EntityPanelProvider>
  );
}
