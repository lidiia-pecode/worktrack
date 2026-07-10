import { meServer } from "@/app/api/auth/auth.server";
import { redirect } from "next/navigation";
import { WeekTimesheet } from "@/app/components/dashboard/WeekTimesheet";

export default async function DashboardPage() {
  const user = await meServer("/dashboard");

  if (!user) {
    redirect("/");
  }

  return <WeekTimesheet />;
}
