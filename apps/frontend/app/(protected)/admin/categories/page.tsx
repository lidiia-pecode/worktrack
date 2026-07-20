import { meServer } from "@/app/api/auth/auth.server";
import { ActCategoryList } from "@/app/components/categories/ActCategoryList";
import { redirect } from "next/navigation";

export default async function ProjectsPage() {
  const loggegIn = await meServer("/projects");
  if (!loggegIn) {
    redirect("/");
  }

  return <ActCategoryList />;
}
