"use client";

import { Crown, Pencil, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Team } from "@/types/Team";
import { TeamRole, TeamStatus } from "@/types/enums";

import { ResourceCard } from "../shared/ResourceCard";
import { ResourceCardField } from "../shared/ResourceCardField";
import { Avatar } from "../shared/Avatar";

interface TeamCardProps {
  team: Team;
  canManage?: boolean;
  onView?: (team: Team) => void;
}

const MAX_VISIBLE_AVATARS = 4;

export function TeamCard({ team, canManage = false, onView }: TeamCardProps) {
  const members = team.memberships?.filter((m) => !m.leftAt && m.user) ?? [];

  const manager = members.find((m) => m.roleInTeam === TeamRole.MANAGER);
  const managerName = manager?.user
    ? `${manager.user.firstName} ${manager.user.lastName}`
    : "Not assigned";

  const isArchived = team.status === TeamStatus.ARCHIVED;

  const visibleMembers = members.slice(0, MAX_VISIBLE_AVATARS);
  const extraCount = members.length - visibleMembers.length;

  return (
    <ResourceCard
      onClick={onView ? () => onView(team) : undefined}
      icon={<UsersRound className="size-5" />}
      title={team.name}
      subtitle={
        <Badge variant={isArchived ? "neutral" : "success"} dot>
          {isArchived ? "Archived" : "Active"}
        </Badge>
      }
      actions={
        canManage && !isArchived ? (
          <Button
            type="button"
            variant="ghost"
            size="iconSm"
            aria-label={`Edit ${team.name}`}
            onClick={(event) => {
              event.stopPropagation();
              onView?.(team);
            }}
          >
            <Pencil className="size-4" />
          </Button>
        ) : undefined
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <ResourceCardField
          label="Manager"
          value={managerName}
          icon={<Crown className="size-3.5" />}
        />

        <ResourceCardField
          label="Members"
          value={members.length}
          icon={<UsersRound className="size-3.5" />}
        />
      </div>

      {members.length > 0 && (
        <div className="mt-4 flex items-center -space-x-2">
          {visibleMembers.map((m) => (
            <Avatar key={m.id} user={m.user!} size="sm" />
          ))}

          {extraCount > 0 && (
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-card">
              +{extraCount}
            </div>
          )}
        </div>
      )}

      {onView && (
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <span className="text-xs text-muted-foreground">Manage team</span>
          <span className="text-xs font-medium text-brand">View team →</span>
        </div>
      )}
    </ResourceCard>
  );
}
