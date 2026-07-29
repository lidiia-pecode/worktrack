import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/api/server/auth";
import { ProjectList } from "@/app/components/project/ProjectList";

export default async function ProjectsAdminPage() {
  const user = await getCurrentUser("/admin/projects/");
  if (!user) {
    redirect("/");
  }

  return <ProjectList />;
}
