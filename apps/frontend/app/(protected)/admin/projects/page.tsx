import { meServer } from "@/app/api/auth/auth.server";
import { ProjectList } from "@/app/components/project/ProjectList";
import { redirect } from "next/navigation";

export default async function ProjectsPage() {
  const loggegIn = await meServer("/projects");
  if (!loggegIn) {
    redirect("/");
  }

  return <ProjectList />;
}
