import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/api/server/auth";
import { ProjectsContent } from "@/app/components/projects/ProjectContent";

export default async function ProjectsAdminPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }

  return <ProjectsContent />;
}
