import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/api/server/auth";
import { TeamsContent } from "@/app/components/teams/TeamsContent";

export default async function TeamsAdminPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return <TeamsContent />;
}
