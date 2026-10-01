import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
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
    default:
      return {
        title: "This link does not work",
        message:
          "It may be incomplete, or a newer invitation may have replaced it. Open the link from your most recent invitation email, or ask the person who invited you to resend it.",
      };
  }
};

interface InvitationProblemProps {
  /** Null for a missing token or a link the API does not know. */
  error: UnusableInvitationError | null;
}

/** Says what is wrong with an invitation link and what to do next. */
export const InvitationProblem = ({ error }: InvitationProblemProps) => {
  const { title, message } = noticeFor(error);
  const isAccepted = error?.code === UnusableInvitationCode.ACCEPTED;

  return (
    <InvitationNoticeLayout title={title} message={message}>
      {isAccepted && (
        <Link href="/login" className={cn(buttonVariants(), "w-full")}>
          Sign in
        </Link>
      )}
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

export const InvitationLoading = () => (
  <InvitationLayout>
    <AuthCard>
      <div className="animate-pulse" aria-busy="true">
        <span className="sr-only">Loading your invitation</span>
        <div className="h-7 w-56 rounded bg-muted" />
        <div className="mt-3 h-4 w-full rounded bg-muted" />
        <div className="mt-8 h-64 w-full rounded-xl bg-muted" />
      </div>
    </AuthCard>
  </InvitationLayout>
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
