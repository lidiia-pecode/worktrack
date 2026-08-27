"use client";

import { UserPlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import { User } from "@/types";

import { fullName } from "@/lib/utils/user";

import { AssignedList } from "../shared/resourse/AssignedList";
import { Avatar } from "../shared/Avatar";

interface ProjectMembersSectionProps {
  members: User[];
  isCreateMode?: boolean;
  onOpenAddMembers: () => void;
  onRemoveMember: (userId: string) => void;
}

export function ProjectMembersSection({
  members,
  isCreateMode = false,
  onOpenAddMembers,
  onRemoveMember,
}: ProjectMembersSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Team members
          </h3>

          <p className="mt-0.5 text-xs text-muted-foreground">
            {members.length} {members.length === 1 ? "person is" : "people are"}{" "}
            {isCreateMode ? "selected" : "assigned to this project"}.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenAddMembers}
          className="gap-1.5"
        >
          <UserPlus className="size-4" />
          Add members
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <AssignedList
          items={members}
          getId={(user) => user.id}
          getPrimary={(user) => fullName(user)}
          getSecondary={(user) => user.email}
          renderLeading={(user) => <Avatar user={user} size="md" />}
          emptyMessage="No members yet. Click 'Add members' to get started."
          renderTrailing={(user) => (
            <Button
              type="button"
              variant="ghost"
              size="iconSm"
              aria-label={`Remove ${user.firstName}`}
              onClick={() => onRemoveMember(user.id)}
            >
              <X className="size-4" />
            </Button>
          )}
        />
      </div>
    </div>
  );
}
