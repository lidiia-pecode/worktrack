"use client";

import { Activity as ActivityIcon, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Activity } from "@/types";

import { AssignedList } from "../shared/resourse/AssignedList";

interface ProjectActivitiesSectionProps {
  activities: Activity[];
  isCreateMode?: boolean;
  onOpenAddActivities: () => void;
  onRemoveActivity: (activityId: string) => void;
}

export function ProjectActivitiesSection({
  activities,
  isCreateMode = false,
  onOpenAddActivities,
  onRemoveActivity,
}: ProjectActivitiesSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Project activities
          </h3>

          <p className="mt-0.5 text-xs text-muted-foreground">
            {activities.length}{" "}
            {activities.length === 1 ? "activity is" : "activities are"}{" "}
            {isCreateMode ? "selected" : "available on this project"}.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenAddActivities}
          className="gap-1.5"
        >
          <Plus className="size-4" />
          Add activities
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <AssignedList
          items={activities}
          getId={(activity) => activity.id}
          getPrimary={(activity) => activity.name}
          getSecondary={(activity) => activity.category?.name}
          renderLeading={() => (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-brand">
              <ActivityIcon className="size-4" />
            </div>
          )}
          emptyMessage="No activities yet. Click 'Add activities' to get started."
          renderTrailing={(activity) => (
            <Button
              type="button"
              variant="ghost"
              size="iconSm"
              aria-label={`Remove ${activity.name}`}
              onClick={() => onRemoveActivity(activity.id)}
            >
              <X className="size-4" />
            </Button>
          )}
        />
      </div>
    </div>
  );
}
