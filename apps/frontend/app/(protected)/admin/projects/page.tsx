import { requireManagerAccess } from "@/lib/api/server/auth";
import { ProjectsContent } from "@/app/components/projects/ProjectContent";

export default async function ProjectsAdminPage() {
  await requireManagerAccess();

  return <ProjectsContent />;
}
