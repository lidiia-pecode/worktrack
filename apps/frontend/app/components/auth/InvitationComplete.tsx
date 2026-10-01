"use client";

import { useSearchParams } from "next/navigation";

import { AuthForm } from "@/app/components/auth/AuthForm";
import { AuthFormWrapper } from "@/app/components/auth/components/AuthFormWrapper";
import {
  InvitationForAnotherAccount,
  InvitationLoadFailed,
  InvitationLoading,
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

interface InvitationCompleteProps {
  signedInEmail: string | null;
}

export const InvitationComplete = ({
  signedInEmail,
}: InvitationCompleteProps) => {
  const isSignedIn = signedInEmail !== null;
  const searchParams = useSearchParams();

  const token = searchParams.get("token") ?? "";
  const googleErrorCode = searchParams.get("error");

  const {
    data: invitation,
    error,
    isError,
    isLoading,
    isRefetching,
    refetch,
  } = useInvitationValidation(token);

  if (!token) {
    return <InvitationProblem error={null} isSignedIn={isSignedIn} />;
  }

  if (isLoading) {
    return <InvitationLoading />;
  }

  if (isError || !invitation) {
    return isUnusableInvitationError(error) ? (
      <InvitationProblem error={error} isSignedIn={isSignedIn} />
    ) : (
      <InvitationLoadFailed
        onRetry={() => refetch()}
        isRetrying={isRefetching}
      />
    );
  }

  // Accepting would create the invitee's account and switch this browser to
  // it, so the visitor first decides whether to sign out.
  if (isSignedIn) {
    return (
      <InvitationForAnotherAccount
        invitedEmail={invitation.email}
        signedInEmail={signedInEmail}
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
        googleErrorCode={googleErrorCode}
      />
    </AuthFormWrapper>
  );
};
