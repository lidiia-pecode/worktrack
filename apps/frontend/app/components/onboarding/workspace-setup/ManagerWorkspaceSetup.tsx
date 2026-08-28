"use client";

import Link from "next/link";

import {
  Activity,
  ArrowRight,
  Check,
  FolderKanban,
  Lock,
  Tags,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { useManagerSetupState } from "@/hooks/auth/useOnboarding";

type SetupStep = {
  id:
    | "team"
    | "members"
    | "project"
    | "activity"
    | "category"
    | "inviteMember"
    | "memberJoined"
    | "addTeamMember";
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
  icon: typeof UsersRound;
  completed: boolean;
  locked: boolean;
};

export function ManagerWorkspaceSetup() {
  const { data, isLoading, isError } = useManagerSetupState();

  if (isLoading) {
    return (
      <section className="w-full max-w-3xl">
        <div className="h-40 animate-pulse rounded-xl border border-border bg-card" />
      </section>
    );
  }

  if (isError || !data) {
    return null;
  }

  const {
    teamAssigned,
    inviteMember,
    memberJoined,
    addTeamMember,
    createProject,
    createActivity,
    createCategory,
  } = data.steps;

  const steps: SetupStep[] = [
    {
      id: "team",
      title: "Join your team",
      description: teamAssigned
        ? "You have been assigned to a team."
        : "Your owner needs to assign you to a team before you can start managing it.",
      icon: UsersRound,
      completed: teamAssigned,
      locked: false,
    },

    {
      id: "inviteMember",
      title: "Invite a team member",
      description: inviteMember
        ? "An employee has been invited to your workspace."
        : "Invite someone who will work on your projects and track their time.",
      href: "/admin/users?onboarding=true",
      actionLabel: "Invite member",
      icon: UserPlus,
      completed: inviteMember,
      locked: !teamAssigned,
    },

    {
      id: "memberJoined",
      title: "Member joins the workspace",
      description: memberJoined
        ? "The invited member has joined the workspace."
        : "The invited member needs to accept the invitation.",
      icon: UserPlus,
      completed: memberJoined,
      locked: !inviteMember,
    },

    {
      id: "addTeamMember",
      title: "Add member to your team",
      description: addTeamMember
        ? "Your team has members assigned and is ready to work."
        : "Add the member who will work on your team's projects.",
      href: "/admin/teams?onboarding=true",
      actionLabel: "Go to Teams",
      icon: UsersRound,
      completed: addTeamMember,
      locked: !memberJoined,
    },

    {
      id: "category",
      title: "Create a category",
      description: "Create a category to organize your activities.",
      href: "/admin/categories?onboarding=true",
      actionLabel: "Continue",
      icon: Tags,
      completed: createCategory,
      locked: !addTeamMember,
    },

    {
      id: "activity",
      title: "Create an activity",
      description: "Create an activity your team can use when logging time.",
      href: "/admin/activities?onboarding=true",
      actionLabel: "Continue",
      icon: Activity,
      completed: createActivity,
      locked: !createCategory,
    },

    {
      id: "project",
      title: "Create your first project",
      description: "Create a project to start organizing your team's work.",
      href: "/admin/projects?onboarding=true",
      actionLabel: "Continue",
      icon: FolderKanban,
      completed: createProject,
      locked: !createActivity,
    },
  ];

  const completedCount = steps.filter((step) => step.completed).length;
  const isComplete = data.setupComplete;
  const progress = (completedCount / steps.length) * 100;

  if (isComplete) {
    return null;
  }

  const currentStep = steps.find((step) => !step.completed && !step.locked);

  return (
    <section className="w-full max-w-3xl">
      <header className="mb-8">
        <p className="mb-2 text-sm font-semibold text-brand">Getting started</p>

        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome to your workspace
        </h1>

        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Complete these steps to get your workspace ready for your team.
        </p>
      </header>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-6 border-b border-border px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-card-foreground">
              Getting started
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              {completedCount} of {steps.length} steps completed
            </p>
          </div>

          <div
            className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-muted"
            aria-label={`${progress}% complete`}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="divide-y divide-border">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCurrent = currentStep?.id === step.id;

            return (
              <div
                key={step.id}
                className={[
                  "flex items-center gap-4 px-6 py-5",
                  step.locked && "opacity-60",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div
                  className={[
                    "flex size-10 shrink-0 items-center justify-center rounded-xl",
                    step.completed
                      ? "bg-success/10 text-success"
                      : step.locked
                        ? "bg-muted text-muted-foreground"
                        : "bg-brand-subtle text-brand",
                  ].join(" ")}
                >
                  {step.completed ? (
                    <Check className="size-[18px]" />
                  ) : step.locked ? (
                    <Lock className="size-[16px]" />
                  ) : (
                    <Icon className="size-[18px]" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {index + 1}
                    </span>

                    <h3
                      className={[
                        "text-sm font-semibold",
                        step.completed
                          ? "text-muted-foreground"
                          : "text-foreground",
                      ].join(" ")}
                    >
                      {step.title}
                    </h3>
                  </div>

                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    {step.description}
                  </p>

                  {step.id === "team" && !teamAssigned && (
                    <p className="mt-2 text-xs font-medium text-muted-foreground">
                      Waiting for owner
                    </p>
                  )}
                </div>

                {isCurrent && step.href && (
                  <Link
                    href={step.href}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {step.actionLabel}
                    <ArrowRight className="size-[15px]" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
