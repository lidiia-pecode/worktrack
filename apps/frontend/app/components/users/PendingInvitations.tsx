"use client";

import { useState } from "react";
import { MailPlus, RefreshCw, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/constants";
import { PendingInvitation } from "@/types/Invitation";
import {
  useInvitations,
  usePendingInvitations,
} from "@/hooks/auth/useInvitation";

import { ImpactDialog } from "../shared/ImpactDialog";
import { ErrorState } from "../shared/ErrorState";
import { UserRole } from "@/types/enums";

const EXPIRES_AT_LABEL = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const teamLabel = ({ role, team }: PendingInvitation): string => {
  if (!team) return "No team";

  return role === UserRole.MANAGER ? `Leads ${team.name}` : team.name;
};

const describeInvitation = (invitation: PendingInvitation): string => {
  const { invitedBy, expiresAt, expired } = invitation;

  return [
    teamLabel(invitation),
    invitedBy && `Sent by ${invitedBy.firstName} ${invitedBy.lastName}`,
    `${expired ? "Expired" : "Expires"} ${EXPIRES_AT_LABEL.format(new Date(expiresAt))}`,
  ]
    .filter(Boolean)
    .join(" · ");
};

/** Revokes an invitation once confirmed; open while `invitation` is set. */
export const RevokeInvitationModal = ({
  invitation,
  onClose,
}: {
  invitation: PendingInvitation | null;
  onClose: () => void;
}) => {
  const {
    actions: { revoke },
  } = useInvitations();

  return (
    <ImpactDialog
      isOpen={Boolean(invitation)}
      title="Revoke invitation?"
      description={`The link sent to ${invitation?.email} will stop working.`}
      confirmText="Revoke"
      confirmVariant="destructive"
      loading={revoke.isPending}
      onConfirm={() =>
        invitation && revoke.mutate(invitation.id, { onSuccess: onClose })
      }
      onClose={onClose}
    />
  );
};

export const PendingInvitations = () => {
  const { data: invitations = [], isError, refetch } = usePendingInvitations();

  const {
    actions: { resend },
  } = useInvitations();

  const [invitationToRevoke, setInvitationToRevoke] =
    useState<PendingInvitation | null>(null);

  if (isError) {
    return (
      <ErrorState
        size="compact"
        title="Could not load pending invitations."
        onRetry={() => refetch()}
        className="mb-6 rounded-2xl border border-border bg-card"
      />
    );
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <Card
      as="section"
      aria-labelledby="pending-invitations-title"
      className="mb-6"
    >
      <CardHeader
        icon={MailPlus}
        title="Pending invitations"
        titleId="pending-invitations-title"
        action={<Badge variant="neutral">{invitations.length}</Badge>}
      />

      <ul className="divide-y divide-border">
        {invitations.map((invitation) => (
          <li
            key={invitation.id}
            className="flex flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">
                  {invitation.email}
                </p>

                <Badge>{ROLE_LABELS[invitation.role] ?? invitation.role}</Badge>

                {invitation.expired && <Badge variant="warning">Expired</Badge>}
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

      <RevokeInvitationModal
        invitation={invitationToRevoke}
        onClose={() => setInvitationToRevoke(null)}
      />
    </Card>
  );
};
