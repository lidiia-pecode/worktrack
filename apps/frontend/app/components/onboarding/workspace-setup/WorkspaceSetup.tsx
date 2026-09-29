"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  FolderKanban,
  RefreshCw,
  Tags,
  UserCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  useInvitations,
  usePendingInvitations,
} from "@/hooks/auth/useInvitation";
import { useOwnerSetupState } from "@/hooks/auth/useOnboarding";
import { setupLink } from "@/hooks/useSetupLink";
import { OwnerSetupState } from "@/types/Onboarding";
import { PendingInvitation } from "@/types/Invitation";
import { UserRole } from "@/types/enums";

import { ErrorState } from "../../shared/ErrorState";
import { useSetupCompleteRedirect } from "./useSetupCompleteRedirect";
import { SetupSkeleton } from "./SetupSkeleton";
import { SetupStepItem, SetupStepRow } from "./SetupStepRow";

const EXPIRY_LABEL = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "long",
});

const requiredSteps = ({
  steps,
  setupProjectId,
}: OwnerSetupState): SetupStepItem[] => {
  const projectLink = setupProjectId
    ? {
        label: "Open project",
        href: setupLink("/admin/projects", { projectId: setupProjectId }),
      }
    : {
        label: "Create project",
        href: setupLink("/admin/projects", { create: true }),
      };

  return [
    {
      id: "company",
      title: "Company details",
      description:
        "Time zone, week start and working day. Change them any time under Settings → Company.",
      icon: Building2,
      completed: true,
      keepsActionWhenDone: true,
      link: { label: "Open Settings", href: "/settings" },
    },
    {
      id: "team",
      title: "Create a team",
      description:
        "A team is a group of people whose time one manager reviews. People join one when they are invited.",
      icon: UsersRound,
      completed: steps.createTeam,
      link: {
        label: "Create team",
        href: setupLink("/admin/teams", { create: true }),
      },
    },
    {
      id: "category",
      title: "Create a category",
      description:
        "Categories group the kinds of work, such as Development or Meetings.",
      icon: Tags,
      completed: steps.createCategory,
      link: {
        label: "Create category",
        href: setupLink("/admin/categories", { create: true }),
      },
    },
    {
      id: "activity",
      title: "Create activities",
      description:
        "Activities are what people log time against, such as Coding or Code review.",
      icon: Activity,
      completed: steps.createActivity,
      locked: !steps.createCategory,
      link: {
        label: "Create activity",
        href: setupLink("/admin/activities", { create: true }),
      },
    },
    {
      id: "projectActivities",
      title: "Add activities to a project",
      description:
        "A project is the work time goes to, for a client or internal. People pick from its activities.",
      icon: FolderKanban,
      completed: steps.addProjectActivities,
      locked: !steps.createActivity,
      link: projectLink,
    },
    {
      id: "projectPeople",
      title: "Put people on the project",
      description:
        "Only people on a project can log time to it. Add yourself if you log time too.",
      icon: UserCheck,
      completed: steps.addProjectPeople,
      locked: !steps.addProjectActivities,
      link: projectLink,
    },
  ];
};

const managerSteps = (
  { steps, managerSteps }: OwnerSetupState,
  invitation: PendingInvitation | undefined,
  resendAction: ReactNode,
): SetupStepItem[] => [
  {
    id: "inviteManager",
    title: "Invite a manager",
    description: "Send an invitation with the Manager role.",
    icon: UserPlus,
    completed: managerSteps.inviteManager,
    link: {
      label: "Invite manager",
      href: setupLink("/admin/users", { create: true }),
    },
  },
  {
    id: "managerJoined",
    title: "The manager accepts",
    description: managerSteps.managerJoined
      ? "A manager has joined the company."
      : invitation
        ? `Waiting for ${invitation.email} to accept. The invitation works until ${EXPIRY_LABEL.format(new Date(invitation.expiresAt))}.`
        : "They join once they accept the invitation email.",
    icon: UserCheck,
    completed: managerSteps.managerJoined,
    locked: !managerSteps.inviteManager,
    extraAction: !managerSteps.managerJoined && invitation && resendAction,
  },
  {
    id: "assignManager",
    title: "Make them a team's manager",
    description: "Open a team and add them to it as its manager.",
    icon: UsersRound,
    completed: managerSteps.assignManager,
    locked: !managerSteps.managerJoined || !steps.createTeam,
    link: { label: "Open teams", href: setupLink("/admin/teams") },
  },
];

const firstOpenStepId = (steps: SetupStepItem[]) =>
  steps.find((step) => !step.completed && !step.locked)?.id;

export function WorkspaceSetup() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useOwnerSetupState();
  const { data: invitations = [] } = usePendingInvitations();
  const {
    actions: { resend },
  } = useInvitations();

  useSetupCompleteRedirect(data?.setupComplete);

  if (isLoading) {
    return <SetupSkeleton />;
  }

  if (isError || !data) {
    return (
      <ErrorState
        title="Setup could not be loaded"
        description="We couldn't check what is already set up. Try again in a moment."
        onRetry={() => refetch()}
        className="w-full max-w-3xl"
      />
    );
  }

  // The redirect to /team is already in flight; do not flash an empty page.
  if (data.setupComplete) {
    return <SetupSkeleton />;
  }

  const managerInvitation = invitations.find(
    (invitation) =>
      invitation.role === UserRole.MANAGER &&
      new Date(invitation.expiresAt) > new Date(),
  );

  const resendAction = managerInvitation && (
    <Button
      type="button"
      variant="outline"
      size="sm"
      isLoading={resend.isPending}
      onClick={() => resend.mutate(managerInvitation.id)}
    >
      {!resend.isPending && <RefreshCw aria-hidden="true" />}
      Resend
    </Button>
  );

  const required = requiredSteps(data);
  const optional = managerSteps(data, managerInvitation, resendAction);
  const doneCount = required.filter((step) => step.completed).length;
  const currentStepId = firstOpenStepId(required);

  return (
    <section className="w-full max-w-3xl">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold text-brand">
            Getting started
          </p>

          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Get your company ready to log time
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Each step checks what is already in place. Once the last one is
            done, people on the project can log their time.
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push("/team")}
        >
          Finish later
        </Button>
      </header>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-6 border-b border-border px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-card-foreground">
              Setup steps
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              {doneCount} of {required.length} done
            </p>
          </div>

          <div
            role="progressbar"
            aria-label="Setup progress"
            aria-valuemin={0}
            aria-valuemax={required.length}
            aria-valuenow={doneCount}
            aria-valuetext={`${doneCount} of ${required.length} steps done`}
            className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${(doneCount / required.length) * 100}%` }}
            />
          </div>
        </div>

        <ol className="divide-y divide-border">
          {required.map((step) => (
            <SetupStepRow
              key={step.id}
              step={step}
              isCurrent={step.id === currentStepId}
            />
          ))}
        </ol>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold text-card-foreground">
            Add a manager <span className="font-normal">(optional)</span>
          </h2>

          <p className="mt-1 text-xs text-muted-foreground">
            A manager reviews and corrects their team&apos;s time. Skip this if
            you look after everyone yourself.
          </p>
        </div>

        <ol className="divide-y divide-border">
          {optional.map((step) => (
            <SetupStepRow key={step.id} step={step} isCurrent={false} />
          ))}
        </ol>
      </div>
    </section>
  );
}
