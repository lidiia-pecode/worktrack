"use client";

import { CalendarOff, Clock, Gauge, UserRound } from "lucide-react";

import { WelcomeCard, type WelcomeItem } from "../../shared/WelcomeCard";

interface EmployeeWelcomeProps {
  userId: string;
  firstName: string;
}

const ITEMS: WelcomeItem[] = [
  {
    icon: Clock,
    title: "Log your time",
    description:
      "Click a day to record the hours you spent on a project and activity.",
  },
  {
    icon: CalendarOff,
    title: "Add an absence",
    description:
      "Holidays and sick days lower what is expected of you for those days.",
  },
  {
    icon: Gauge,
    title: "Your week at a glance",
    description:
      "The top of the page compares what you logged with what is expected.",
  },
  {
    icon: UserRound,
    title: "Your account",
    description:
      "Change your name and password, or link your Google account, in Settings.",
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
