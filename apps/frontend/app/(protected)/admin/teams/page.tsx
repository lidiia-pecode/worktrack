import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/api/server/auth";
import { TeamsPage } from "@/app/components/teams/TeamsPage";

export default async function TeamsAdminPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return <TeamsPage />;
}
