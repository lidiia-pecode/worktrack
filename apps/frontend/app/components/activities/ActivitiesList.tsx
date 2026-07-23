"use client";
import { useState, useMemo } from "react";
import Container from "../layout/Container";
import { UserRole, Status } from "../../../types/enums";
import { useMe } from "@/hooks/useMe";
import { ActivityCard } from "./ActivityCard";
import { useActivities } from "@/hooks/useActivities";
import { EntityList } from "../shared/EntityList";
import { EmptyState } from "../shared/EmptyState";
import { LoadingState } from "../shared/LoadingState";
import { ErrorState } from "../shared/ErrorState";
import { CreateActivityModal } from "./CreateActivityModal";
import { FilterBar } from "../shared/FilterBar";
import { ClipboardList, ListChecks } from "lucide-react";

export const ActivityList = () => {
  const { items: activities, isLoading, isError, refetch } = useActivities();
  const me = useMe();
  const currentUserRole = me.data?.role;
  const isAdmin =
    currentUserRole === UserRole.ADMIN ||
    currentUserRole === UserRole.SUPER_ADMIN;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [activities, search, statusFilter]);

  const archivedCount = useMemo(
    () => activities.filter((a) => a.status === Status.ARCHIVED).length,
    [activities],
  );

  if (isLoading) {
    return (
      <Container className="flex flex-col grow">
        <LoadingState
          title="Loading activities"
          description="Fetching your activities..."
        />
      </Container>
    );
  }

  if (isError || !isAdmin) {
    return (
      <Container className="flex flex-col grow">
        <ErrorState title="Couldn't load activities" onRetry={refetch} />
      </Container>
    );
  }

  if (!activities.length) {
    return (
      <Container className="flex flex-col grow">
        <EmptyState
          title="No activities yet"
          description="Create an activity to assign it to your projects."
          icon={<ClipboardList className="h-8 w-8 text-muted-foreground" />}
          action={isAdmin && <CreateActivityModal />}
        />
      </Container>
    );
  }

  return (
    <Container className="flex flex-col grow">
      {isAdmin && <CreateActivityModal />}

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={(val) => setStatusFilter(val)}
        archivedCount={archivedCount}
      />

      {filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            title={
              search
                ? "No activities match your search"
                : "No activities in this status"
            }
            description={search ? "Try a different search term." : undefined}
            icon={<ListChecks className="h-8 w-8 text-muted-foreground" />}
          />
        </div>
      ) : (
        <EntityList
          items={filtered}
          renderItem={(activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              isAdmin={isAdmin}
            />
          )}
        />
      )}
    </Container>
  );
};
