import { meServer } from "@/app/api/auth/auth.server";
import { ActivityList } from "@/app/components/activities/ActivitiesList";
import { redirect } from "next/navigation";

export default async function ProjectsPage() {
  const loggegIn = await meServer("/projects");
  if (!loggegIn) {
    redirect("/");
  }

  return <ActivityList />;
}
