"use client";
import Container from "../layout/Container";
import { UserRole } from "../../../types/enums";
import { useMe } from "@/hooks/useMe";
import { ActivityCard } from "./ActivityCard";
import { useActivities } from "@/hooks/useActivities";
import { EntityList } from "../shared/EntityList";
import { EmptyState } from "../shared/EmptyState";
import { LoadingState } from "../shared/LoadingState";
import { ErrorState } from "../shared/ErrorState";
import { CreateActivityModal } from "./CreateActivityModal";

export const ActivityList = () => {
  const { items: activities, isLoading, isError, refetch } = useActivities();
  const me = useMe();
  const currentUserRole = me.data?.role;
  const isAdmin =
    currentUserRole === UserRole.ADMIN ||
    currentUserRole === UserRole.SUPER_ADMIN;

  if (isLoading) {
    return (
      <LoadingState
        title="Loading activities"
        description="Fetching your activities..."
      />
    );
  }

  if (isError || !isAdmin) {
    return <ErrorState title="Couldn't load activities" onRetry={refetch} />;
  }

  if (!activities.length) {
    return (
      <EmptyState
        title="No activities yet"
        description="Create an activity to assign it to your projects."
        action={isAdmin && <CreateActivityModal />}
      />
    );
  }

  return (
    <Container className="flex flex-col grow">
      {isAdmin && <CreateActivityModal />}

      <EntityList
        items={activities}
        renderItem={(activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            isAdmin={isAdmin}
          />
        )}
      />
    </Container>
  );
};
