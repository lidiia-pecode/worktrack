"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthActions } from "@/hooks/auth/useAuthActions";
import { INVITATION_VALID_DAYS } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";
import { UnusableInvitationCode } from "@/types/enums";
import type { UnusableInvitationError } from "@/types/Invitation";

import { AuthCard } from "./AuthCard";
import { AuthFormWrapper } from "./AuthFormWrapper";

interface Notice {
  title: string;
  message: string;
}

const askInviter = (error: UnusableInvitationError) =>
  [
    error.inviterName ?? "the person who invited you",
    error.companyName && `at ${error.companyName}`,
  ]
    .filter(Boolean)
    .join(" ");

const noticeFor = (error: UnusableInvitationError | null): Notice => {
  switch (error?.code) {
    case UnusableInvitationCode.EXPIRED:
      return {
        title: "This invitation has expired",
        message: `Invitations are valid for ${INVITATION_VALID_DAYS} days. Ask ${askInviter(error)} to resend it, and use the link in the new email.`,
      };
    case UnusableInvitationCode.REVOKED:
      return {
        title: "This invitation was withdrawn",
        message: `It can no longer be used. If you think that is a mistake, ask ${askInviter(error)} to invite you again.`,
      };
    case UnusableInvitationCode.ACCEPTED:
      return {
        title: "You have already joined",
        message:
          "This invitation has been accepted. Sign in with the email address it was sent to.",
      };
    case UnusableInvitationCode.ACCOUNT_EXISTS:
      return {
        title: "This email already has an account",
        message:
          "A WorkTrack account belongs to one company, so this invitation can't be used with it. Sign in to your account, or ask the person who invited you to use a different email address.",
      };
    default:
      return {
        title: "This link does not work",
        message:
          "It may be incomplete, or a newer invitation may have replaced it. Open the link from your most recent invitation email, or ask the person who invited you to resend it.",
      };
  }
};

const SIGN_IN_CODES = [
  UnusableInvitationCode.ACCEPTED,
  UnusableInvitationCode.ACCOUNT_EXISTS,
];

const GoToAppLink = () => (
  <Link href="/" className={cn(buttonVariants(), "w-full")}>
    Go to WorkTrack
  </Link>
);

interface InvitationProblemProps {
  error: UnusableInvitationError | null;
  isSignedIn: boolean;
}

/** Says what is wrong with an invitation link and what to do next. */
export const InvitationProblem = ({
  error,
  isSignedIn,
}: InvitationProblemProps) => {
  const { title, message } = noticeFor(error);
  const offersSignIn = !!error && SIGN_IN_CODES.includes(error.code);

  return (
    <InvitationNoticeLayout title={title} message={message}>
      {isSignedIn ? (
        <GoToAppLink />
      ) : (
        offersSignIn && (
          <Link href="/login" className={cn(buttonVariants(), "w-full")}>
            Sign in
          </Link>
        )
      )}
    </InvitationNoticeLayout>
  );
};

interface InvitationForAnotherAccountProps {
  invitedEmail: string;
  signedInEmail: string;
}

export const InvitationForAnotherAccount = ({
  invitedEmail,
  signedInEmail,
}: InvitationForAnotherAccountProps) => {
  const router = useRouter();
  const { logout } = useAuthActions();

  const signOut = () =>
    logout.mutate(undefined, { onSuccess: () => router.refresh() });

  return (
    <InvitationNoticeLayout
      title="You're already signed in"
      message={`This invitation is for ${invitedEmail}. You're signed in as ${signedInEmail}.`}
    >
      <div className="flex flex-col gap-3">
        <GoToAppLink />

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={signOut}
          isLoading={logout.isPending}
        >
          Sign out to accept
        </Button>
      </div>
    </InvitationNoticeLayout>
  );
};

interface InvitationLoadFailedProps {
  onRetry: () => void;
  isRetrying: boolean;
}

export const InvitationLoadFailed = ({
  onRetry,
  isRetrying,
}: InvitationLoadFailedProps) => (
  <InvitationNoticeLayout
    title="Your invitation could not be loaded"
    message="Check your connection and try again."
  >
    <Button
      type="button"
      className="w-full"
      onClick={onRetry}
      isLoading={isRetrying}
    >
      Try again
    </Button>
  </InvitationNoticeLayout>
);

export const INVITED_HEADING = {
  badge: "You're invited",
  title: "Join your team on WorkTrack.",
};

export const InvitationLoading = () => (
  <AuthFormWrapper
    {...INVITED_HEADING}
    description="Checking your invitation link."
  >
    <AuthCard>
      <div role="status" aria-busy="true">
        <span className="sr-only">Loading your invitation</span>
        <Skeleton className="h-7 w-56" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-8 h-64 w-full rounded-xl" />
      </div>
    </AuthCard>
  </AuthFormWrapper>
);

const InvitationLayout = ({ children }: { children: React.ReactNode }) => (
  <AuthFormWrapper
    badge="Invitation"
    title="Joining a company on WorkTrack."
    description="Everyone joins through a link in an invitation email from their company."
  >
    {children}
  </AuthFormWrapper>
);

interface InvitationNoticeLayoutProps extends Notice {
  children?: React.ReactNode;
}

const InvitationNoticeLayout = ({
  title,
  message,
  children,
}: InvitationNoticeLayoutProps) => (
  <InvitationLayout>
    <AuthCard title={title} description={message}>
      {children}
    </AuthCard>
  </InvitationLayout>
);
