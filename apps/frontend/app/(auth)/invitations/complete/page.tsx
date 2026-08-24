"use client";

import { useSearchParams } from "next/navigation";

import { AuthForm } from "@/app/components/auth/AuthForm";
import { AuthFormWrapper } from "@/app/components/auth/components/AuthFormWrapper";

import { useInvitationValidation } from "@/hooks/useInvitation";

export default function InvitationCompletePage() {
  const searchParams = useSearchParams();

  const token = searchParams.get("token") ?? "";

  const {
    data: invitation,
    isLoading,
    isError,
  } = useInvitationValidation(token);

  if (!token || isLoading) {
    return <InvitationCompleteLoading />;
  }

  if (isError || !invitation) {
    return <InvitationUnavailable />;
  }

  return (
    <AuthFormWrapper
      badge="You're invited"
      title="Join your workspace."
      description="Complete your account setup and start working with your team on Worktrack."
    >
      <AuthForm
        mode="invitation"
        invitation={{
          token,
          email: invitation.email,
          role: invitation.role,
        }}
      />
    </AuthFormWrapper>
  );
}

function InvitationUnavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card/90 p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">
          Invitation unavailable
        </h1>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This invitation is invalid, expired, or no longer available.
        </p>
      </div>
    </main>
  );
}

function InvitationCompleteLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card/90 p-8 shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="mt-5 h-9 w-64 rounded bg-muted" />
          <div className="mt-3 h-4 w-full rounded bg-muted" />
          <div className="mt-8 h-96 w-full rounded-2xl bg-muted" />
        </div>
      </div>
    </main>
  );
}
