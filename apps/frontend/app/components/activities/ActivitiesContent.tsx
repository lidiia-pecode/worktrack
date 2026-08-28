"use client";

import { useMemo, useState } from "react";

import { ClipboardList } from "lucide-react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useActivitiesInfiniteQuery } from "@/hooks/useActivities";

import { hasManagerAccess } from "@/lib/utils/user";

import { Activity } from "@/types";
import { ActivityStatus } from "@/types/enums";

import { ResourcePage } from "../shared/resourse/ResourcePage";

import { ActivityCard } from "./ActivityCard";
import { ActivityModal } from "./ActivityModal";
import { useSearchParams } from "next/navigation";

export function ActivitiesContent() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(
    null,
  );

  const { user } = useAuth();
  const canManage = hasManagerAccess(user?.role);

  const {
    items: activities,
    isLoading,
    isError,
    refetch,
    pagination,
  } = useActivitiesInfiniteQuery();

  const activeActivities = useMemo(
    () =>
      activities.filter(
        (activity) => activity.status !== ActivityStatus.ARCHIVED,
      ),
    [activities],
  );

  const editingActivity = useMemo(
    () =>
      activeActivities.find((activity) => activity.id === editingActivityId),
    [activeActivities, editingActivityId],
  );

  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get("onboarding") === "true";

  return (
    <>
      <ResourcePage<Activity>
        title="Activities"
        description="Manage activities that can be assigned to projects."
        items={activeActivities}
        isLoading={isLoading}
        isError={isError || !canManage}
        onRetry={refetch}
        getSearchValue={(activity) => activity.name}
        searchPlaceholder="Search activities..."
        emptyTitle="No activities yet"
        emptyDescription="Create your first activity to start tracking work."
        emptyIcon={<ClipboardList className="size-6" />}
        createLabel="Create activity"
        onCreate={() => setCreateOpen(true)}
        canCreate={canManage}
        hasNextPage={pagination.hasNextPage}
        isFetchingNextPage={pagination.isFetchingNextPage}
        onFetchNextPage={pagination.fetchNextPage}
        renderItem={(activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            canManage={canManage}
            onView={(a) => setEditingActivityId(a.id)}
          />
        )}
      />

      <ActivityModal
        isOnboarding={isOnboarding}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      <ActivityModal
        isOnboarding={isOnboarding}
        open={Boolean(editingActivityId)}
        onClose={() => setEditingActivityId(null)}
        activity={editingActivity}
      />
    </>
  );
}
