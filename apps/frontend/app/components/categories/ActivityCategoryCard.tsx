"use client";

import { Pencil, Tags } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { ActivityCategory } from "@/types";
import { ActCategoryStatus } from "@/types/enums";

import { ResourceCard } from "../shared/resourse/ResourceCard";

interface ActivityCategoryCardProps {
  category: ActivityCategory;
  canManage?: boolean;
  onView?: (category: ActivityCategory) => void;
}

export function ActivityCategoryCard({
  category,
  canManage = false,
  onView,
}: ActivityCategoryCardProps) {
  const isArchived = category.status === ActCategoryStatus.ARCHIVED;

  return (
    <ResourceCard
      onClick={onView ? () => onView(category) : undefined}
      icon={<Tags className="size-5" />}
      title={category.name}
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
            aria-label={`Edit ${category.name}`}
            onClick={(event) => {
              event.stopPropagation();
              onView?.(category);
            }}
          >
            <Pencil className="size-4" />
          </Button>
        ) : undefined
      }
    ></ResourceCard>
  );
}
