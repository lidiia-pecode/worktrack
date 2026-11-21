"use client";

import { CalendarOff } from "lucide-react";

import { WelcomeCard, type WelcomeItem } from "../../shared/WelcomeCard";
import { myTime, timesheet } from "../../layout/sidebar/sidebar-navigation";

interface EmployeeWelcomeProps {
  userId: string;
  firstName: string;
}

const ITEMS: WelcomeItem[] = [
  {
    icon: timesheet.icon,
    title: "Log your time",
    description: "Click a day to record your hours on a project and activity.",
  },
  {
    icon: CalendarOff,
    title: "Add an absence",
    description:
      "Holidays and sick days lower what's expected of you on those days.",
  },
  {
    icon: myTime.icon,
    title: "Your month",
    description:
      "Hours against expected and days still to fill, in Review my time.",
    href: myTime.href,
  },
];

export const EmployeeWelcome = ({
  userId,
  firstName,
}: EmployeeWelcomeProps) => (
  <WelcomeCard
    dismissKey={`worktrack:employee-welcome:${userId}`}
    firstName={firstName}
    status="This is your timesheet, where you record your working hours."
    items={ITEMS}
  />
);
