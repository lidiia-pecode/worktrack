import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/api/server/auth";
import { EmployeeWelcome } from "@/app/components/timesheet/components/EmployeeWelcome";
import { WeekTimesheet } from "@/app/components/timesheet/WeekTimesheet";
import { UserRole } from "@/types/enums";

type TimesheetPageProps = {
  /** `week`: any day of the week to open, as My time links to it. */
  searchParams: Promise<{ week?: string }>;
};

export default async function TimesheetPage({
  searchParams,
}: TimesheetPageProps) {
  const user = await getCurrentUser();
  const { week } = await searchParams;

  if (!user) {
    redirect("/");
  }

  return (
    <WeekTimesheet
      // A new link starts from its own week, even while on the timesheet.
      key={week}
      userId={user.id}
      startingDay={week}
      welcome={
        user.role === UserRole.EMPLOYEE && (
          <EmployeeWelcome userId={user.id} firstName={user.firstName} />
        )
      }
    />
  );
}
