"use client";

import { useSearchParams } from "next/navigation";

import { AuthForm } from "@/app/components/auth/AuthForm";
import { AuthFormWrapper } from "@/app/components/auth/components/AuthFormWrapper";
import {
  InvitationLoadFailed,
  InvitationProblem,
} from "@/app/components/auth/components/InvitationProblem";
import { useInvitationValidation } from "@/hooks/auth/useInvitation";
import { isUnusableInvitationError } from "@/lib/api/errors";
import { UserRole } from "@/types/enums";
import type { InvitationValidation } from "@/types/Invitation";

const describeInvitation = ({
  companyName,
  inviterName,
  role,
  teamName,
}: InvitationValidation): string => {
  const who = inviterName ? `${inviterName} invited you` : "You are invited";
  const as = role === UserRole.MANAGER ? "a manager" : "an employee";
  const team = teamName ? `, in the team “${teamName}”` : "";

  return `${who} to join ${companyName} as ${as}${team}. Create your account to start tracking your time.`;
};

export default function InvitationCompletePage() {
  const searchParams = useSearchParams();

  const token = searchParams.get("token") ?? "";

  const {
    data: invitation,
    error,
    isError,
    isLoading,
    isRefetching,
    refetch,
  } = useInvitationValidation(token);

  if (!token) {
    return <InvitationProblem error={null} />;
  }

  if (isLoading) {
    return <InvitationCompleteLoading />;
  }

  if (isError || !invitation) {
    return isUnusableInvitationError(error) ? (
      <InvitationProblem error={error} />
    ) : (
      <InvitationLoadFailed
        onRetry={() => refetch()}
        isRetrying={isRefetching}
      />
    );
  }

  return (
    <AuthFormWrapper
      badge="You're invited"
      title="Join your team on WorkTrack."
      description={describeInvitation(invitation)}
    >
      <AuthForm
        mode="invitation"
        invitation={{
          token,
          email: invitation.email,
          role: invitation.role,
          companyName: invitation.companyName,
          teamName: invitation.teamName,
        }}
      />
    </AuthFormWrapper>
  );
}

function InvitationCompleteLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card/90 p-8 shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="mt-5 h-9 w-64 rounded bg-muted" />
          <div className="mt-3 h-4 w-full rounded bg-muted" />
          <div className="mt-8 h-96 w-full rounded-2xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
