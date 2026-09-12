"use client";

import { FolderKanban, Pencil, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Project } from "@/types";
import { ProjectStatus } from "@/types/enums";

import { ResourceCard } from "../shared/resourse/ResourceCard";
import { ResourceCardField } from "../shared/resourse/ResourceCardField";

interface ProjectCardProps {
  project: Project;
  canManage?: boolean;
  onView?: (project: Project) => void;
}

export function ProjectCard({
  project,
  canManage = false,
  onView,
}: ProjectCardProps) {
  const membersCount = project.membersCount ?? 0;
  const activitiesCount = project.projectActivities?.length ?? 0;
  const isArchived = project.status === ProjectStatus.ARCHIVED;

  return (
    <ResourceCard
      onClick={onView ? () => onView(project) : undefined}
      icon={<FolderKanban className="size-5" />}
      title={project.name}
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
            aria-label={`Edit ${project.name}`}
            onClick={(event) => {
              event.stopPropagation();
              onView?.(project);
            }}
          >
            <Pencil className="size-4" />
          </Button>
        ) : undefined
      }
    >
      <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">
        {project.description || "No description"}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <ResourceCardField
          label="Members"
          value={membersCount}
          icon={<UsersRound className="size-3.5" />}
        />
        <ResourceCardField
          label="Activities"
          value={activitiesCount}
          icon={<FolderKanban className="size-3.5" />}
        />
      </div>

      {onView && (
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <span className="text-xs text-muted-foreground">Manage project</span>
          <span className="text-xs font-medium text-brand">View project →</span>
        </div>
      )}
    </ResourceCard>
  );
}
