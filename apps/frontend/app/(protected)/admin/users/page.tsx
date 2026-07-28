import { meServer } from "@/app/api/auth/auth.server";
import UsersList from "@/app/components/users/UsersList";
import { redirect } from "next/navigation";

export default async function ProjectsPage() {
  const loggegIn = await meServer("/projects");
  if (!loggegIn) {
    redirect("/");
  }

  return <UsersList />;
}
