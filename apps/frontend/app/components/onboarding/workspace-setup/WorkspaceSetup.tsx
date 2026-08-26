"use client";

import Link from "next/link";

import { ArrowRight, Check, Lock, UserPlus, UsersRound } from "lucide-react";

import { useOwnerSetupState } from "@/hooks/useOnboarding";

type SetupStep = {
  id: "team" | "manager";
  title: string;
  description: string;
  href: string;
  icon: typeof UsersRound;
  completed: boolean;
  locked: boolean;
};

export function WorkspaceSetup() {
  const { data, isLoading, isError } = useOwnerSetupState();

  console.log("ONBOARDING DATA:", data);

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

  const { createTeam, inviteManager } = data.steps;

  const steps: SetupStep[] = [
    {
      id: "team",
      title: "Create your first team",
      description: "Create a team to organize your people and projects.",
      href: "/admin/teams?onboarding=true",
      icon: UsersRound,
      completed: createTeam,
      locked: false,
    },
    {
      id: "manager",
      title: "Invite a manager",
      description: "Invite a manager to help manage your workspace.",
      href: "/admin/users?onboarding=true",
      icon: UserPlus,
      completed: inviteManager,
      locked: !createTeam,
    },
  ];

  const completedCount = steps.filter((step) => step.completed).length;

  const isComplete = completedCount === steps.length;
  const progress = (completedCount / steps.length) * 100;

  if (isComplete) {
    return null;
  }

  const currentStep = steps.find((step) => !step.completed && !step.locked);

  return (
    <section className="w-full max-w-3xl">
      <header className="mb-8">
        <p className="mb-2 text-sm font-semibold text-brand">Workspace setup</p>

        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Let&apos;s get your workspace ready
        </h1>

        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Set up your first team and invite a manager to help run your
          workspace.
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
                ].join(" ")}
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
                </div>

                {isCurrent && (
                  <Link
                    href={step.href}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    Continue
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
