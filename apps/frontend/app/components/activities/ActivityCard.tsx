"use client";

import { Archive, ClipboardList, Tags } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { useActivities } from "@/hooks/useActivities";

import { Activity } from "@/types";
import { ActivityStatus } from "@/types/enums";

import { ResourceCard } from "../shared/resourse/ResourceCard";
import { ResourceCardField } from "../shared/resourse/ResourceCardField";

interface ActivityCardProps {
  activity: Activity;
  canManage?: boolean;
  onView?: (activity: Activity) => void;
}

export function ActivityCard({
  activity,
  canManage = false,
  onView,
}: ActivityCardProps) {
  const {
    actions: { archive },
  } = useActivities();

  console.log("ActivityCard", {
    id: activity.id,
    name: activity.name,
    category: activity.category,
  });

  const isArchived = activity.status === ActivityStatus.ARCHIVED;

  return (
    <ResourceCard
      onClick={onView ? () => onView(activity) : undefined}
      icon={<ClipboardList className="size-5" />}
      title={activity.name}
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
            aria-label={`Archive ${activity.name}`}
            onClick={(event) => {
              event.stopPropagation();
              archive.mutate(activity.id);
            }}
            isLoading={archive.isPending}
          >
            <Archive className="size-4" />
          </Button>
        ) : undefined
      }
    >
      <ResourceCardField
        label="Category"
        value={activity.category.name}
        icon={<Tags className="size-3.5" />}
      />
    </ResourceCard>
  );
}
