"use client";

import { useState } from "react";
import { MailPlus, RefreshCw, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/constants";
import { PendingInvitation } from "@/types/Invitation";
import {
  useInvitations,
  usePendingInvitations,
} from "@/hooks/auth/useInvitation";

import { ConfirmModal } from "../shared/ConfirmModal";

const EXPIRES_AT_LABEL = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const describeInvitation = ({
  team,
  invitedBy,
  expiresAt,
}: PendingInvitation): string =>
  [
    team?.name ?? "No team",
    invitedBy && `Sent by ${invitedBy.firstName} ${invitedBy.lastName}`,
    `Expires ${EXPIRES_AT_LABEL.format(new Date(expiresAt))}`,
  ]
    .filter(Boolean)
    .join(" · ");

export const PendingInvitations = () => {
  const { data: invitations = [], isError, refetch } = usePendingInvitations();

  const {
    actions: { resend, revoke },
  } = useInvitations();

  const [invitationToRevoke, setInvitationToRevoke] =
    useState<PendingInvitation | null>(null);

  if (isError) {
    return (
      <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-3 text-sm text-muted-foreground">
        Could not load pending invitations.
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (invitations.length === 0) {
    return null;
  }

  const handleRevoke = () => {
    if (!invitationToRevoke) {
      return;
    }

    revoke.mutate(invitationToRevoke.id, {
      onSuccess: () => setInvitationToRevoke(null),
    });
  };

  return (
    <section
      aria-labelledby="pending-invitations-title"
      className="mb-6 rounded-2xl border border-border bg-card shadow-sm"
    >
      <header className="flex items-center gap-2 border-b border-border px-5 py-3">
        <MailPlus className="size-4 text-brand" aria-hidden="true" />

        <h2
          id="pending-invitations-title"
          className="text-sm font-semibold text-card-foreground"
        >
          Pending invitations
        </h2>

        <Badge variant="neutral">{invitations.length}</Badge>
      </header>

      <ul className="divide-y divide-border">
        {invitations.map((invitation) => (
          <li
            key={invitation.id}
            className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">
                  {invitation.email}
                </p>

                <Badge>{ROLE_LABELS[invitation.role] ?? invitation.role}</Badge>
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                {describeInvitation(invitation)}
              </p>
            </div>

            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => resend.mutate(invitation.id)}
                isLoading={
                  resend.isPending && resend.variables === invitation.id
                }
                disabled={resend.isPending}
              >
                <RefreshCw className="size-3.5" aria-hidden="true" />
                Resend
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setInvitationToRevoke(invitation)}
              >
                <X className="size-3.5" aria-hidden="true" />
                Revoke
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmModal
        isOpen={Boolean(invitationToRevoke)}
        title="Revoke invitation?"
        message={`The link sent to ${invitationToRevoke?.email} will stop working.`}
        confirmText="Revoke"
        variant="danger"
        loading={revoke.isPending}
        onConfirm={handleRevoke}
        onClose={() => setInvitationToRevoke(null)}
      />
    </section>
  );
};
