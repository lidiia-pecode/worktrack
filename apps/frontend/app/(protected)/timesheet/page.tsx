import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/api/server/auth";
import { EmployeeWelcome } from "@/app/components/timesheet/components/EmployeeWelcome";
import { WeekTimesheet } from "@/app/components/timesheet/WeekTimesheet";
import { UserRole } from "@/types/enums";
import { timesheet } from "@/app/components/layout/sidebar/sidebar-navigation";

export const metadata: Metadata = { title: timesheet.label };

export default async function TimesheetPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return (
    <WeekTimesheet
      userId={user.id}
      welcome={
        user.role === UserRole.EMPLOYEE && (
          <EmployeeWelcome userId={user.id} firstName={user.firstName} />
        )
      }
    />
  );
}
