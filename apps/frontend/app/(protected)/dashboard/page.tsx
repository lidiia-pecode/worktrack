import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/api/server/auth";
import { WeekTimesheet } from "@/app/components/timesheet/WeekTimesheet";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return <WeekTimesheet />;
}
