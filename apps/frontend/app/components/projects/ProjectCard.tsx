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
  const members = project.users ?? [];

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
      <div className="space-y-4">
        <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">
          {project.description || "No description"}
        </p>

        <div className="grid grid-cols-2 gap-4">
          <ResourceCardField
            label="Members"
            value={members.length}
            icon={<UsersRound className="size-3.5" />}
          />

          <ResourceCardField
            label="Activities"
            value={project.projectActivities?.length ?? 0}
            icon={<FolderKanban className="size-3.5" />}
          />
        </div>
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
