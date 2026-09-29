"use client";

import Link from "next/link";
import { Hand } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDismissible } from "@/hooks/useDismissible";
import { useTeamOptions } from "@/hooks/useTeams";

import { CloseButton } from "../../shared/buttons/CloseButton";

interface ManagerWelcomeProps {
  userId: string;
  firstName: string;
}

const MANAGER_CAN = [
  { text: "See and correct your team's time, here on Team time." },
  { text: "Plan their week by project.", href: "/planning", label: "Planning" },
  { text: "Report on their hours.", href: "/reports", label: "Reports" },
  {
    text: "Invite employees into your teams.",
    href: "/admin/users",
    label: "Users",
  },
  {
    text: "Create projects and activities, and put your people and yourself on projects.",
    href: "/admin/projects",
    label: "Projects",
  },
];

const OWNER_HANDLES = [
  "Creating teams and choosing who leads them",
  "Moving people between teams and changing roles",
  "Company settings and closing months",
];

const teamNames = (names: string[]) =>
  new Intl.ListFormat("en", { type: "conjunction" }).format(names);

export const ManagerWelcome = ({ userId, firstName }: ManagerWelcomeProps) => {
  const { isDismissed, dismiss } = useDismissible(
    `worktrack:manager-welcome:${userId}`,
  );
  const { options: teams, isLoading } = useTeamOptions();

  if (isDismissed) return null;

  return (
    <section
      aria-labelledby="manager-welcome-title"
      className="mb-6 rounded-xl border border-border bg-card p-6 shadow-sm"
    >
      <div className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-subtle text-brand">
          <Hand className="size-5" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <h2
            id="manager-welcome-title"
            className="text-base font-semibold text-foreground"
          >
            Welcome, {firstName}
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading
              ? "Checking which teams you lead..."
              : teams.length > 0
                ? `You lead ${teamNames(teams.map((team) => team.label))}. You see and act for the people in ${teams.length === 1 ? "it" : "them"}.`
                : "You don't lead a team yet. Once the owner makes you a team's manager, its people appear here."}
          </p>
        </div>

        <CloseButton aria-label="Dismiss welcome" onClick={dismiss} />
      </div>

      <div className="mt-5 grid gap-6 pl-14 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            What you can do
          </h3>

          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            {MANAGER_CAN.map((item) => (
              <li key={item.text}>
                {item.text}
                {item.href && (
                  <>
                    {" "}
                    <Link
                      href={item.href}
                      className="font-medium text-brand hover:underline"
                    >
                      {item.label}
                    </Link>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">
            What the owner handles
          </h3>

          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            {OWNER_HANDLES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 pl-14">
        <Button type="button" variant="outline" size="sm" onClick={dismiss}>
          Got it
        </Button>
      </div>
    </section>
  );
};
