"use client";

import { useState } from "react";

import {
  useActivitiesInfiniteQuery,
  useActivitiesMutations,
} from "@/hooks/useActivities";
import { useServerSearch } from "@/hooks/useManageListState";
import { ActivityCategoryDetails } from "@/types";
import { ActivityStatus } from "@/types/enums";

import { ActivityCreateDialog } from "../activities/ActivityCreateDialog";
import { PanelView } from "../entity-panel/EntityPanelLayout";
import { useStagedSelection } from "../entity-panel/useStagedSelection";
import { EntityPicker } from "../shared/resource/EntityPicker";
import {
  CategoryActivityMovesDialog,
  MoveIn,
} from "./CategoryActivityMovesDialog";

export const ACTIVITIES_PICKER = "add-activities";

/** Adding an activity moves it here from its own category; Done confirms every move. */
export const CategoryActivitiesPicker = ({
  category,
}: {
  category: ActivityCategoryDetails;
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const { searchQuery, setSearch } = useServerSearch();
  const { update } = useActivitiesMutations();
  const { items, isLoading, pagination } = useActivitiesInfiniteQuery({
    status: ActivityStatus.ACTIVE,
    search: searchQuery,
  });

  // An archived activity is read-only, so it stays and is not offered.
  const staged = useStagedSelection<MoveIn>(
    category.activities
      .filter((activity) => activity.status === ActivityStatus.ACTIVE)
      .map(({ id, name }) => ({ id, name, fromCategory: category.name })),
  );

  const isInUse = (activityId: string) =>
    category.activities.some(
      (activity) => activity.id === activityId && activity.isInUse,
    );
  const movesOut = staged.toRemove.filter((activity) => isInUse(activity.id));
  const toDrafts = staged.toRemove.filter((activity) => !isInUse(activity.id));

  const applyAll = (destinationId: string | null) =>
    staged.apply([
      ...staged.toAdd.map((activity) =>
        update.mutateAsync({
          id: activity.id,
          data: { categoryId: category.id },
        }),
      ),
      ...movesOut.map((activity) =>
        update.mutateAsync({
          id: activity.id,
          data: { categoryId: destinationId },
        }),
      ),
      ...toDrafts.map((activity) =>
        update.mutateAsync({ id: activity.id, data: { categoryId: null } }),
      ),
    ]);

  const done = () => {
    if (staged.pendingCount > 0) setIsConfirming(true);
    else staged.cancel();
  };

  return (
    <>
      <PanelView
        title={`Add activities to ${category.name}`}
        description="Choose them, then Done; choose one again to take it off. An activity is in one category at most, so Done confirms what moves."
        create={{ label: "New activity", onClick: () => setIsCreating(true) }}
        pendingCount={staged.pendingCount}
        isApplying={staged.isApplying}
        onDone={done}
        onCancel={staged.cancel}
      >
        <EntityPicker
          items={items}
          selectedIds={staged.selectedIds}
          onToggle={(activity) =>
            staged.toggle({
              id: activity.id,
              name: activity.name,
              fromCategory: activity.category?.name ?? null,
            })
          }
          getId={(activity) => activity.id}
          getLabel={(activity) => activity.name}
          getSubtitle={(activity) =>
            activity.category?.name ?? "No category (draft)"
          }
          onSearchChange={setSearch}
          isLoading={isLoading}
          hasNextPage={pagination.hasNextPage}
          isFetchingNextPage={pagination.isFetchingNextPage}
          onFetchNextPage={pagination.fetchNextPage}
          emptyMessage="No activities yet. Make the first with New activity."
          searchPlaceholder="Search activities..."
        />
      </PanelView>

      {/* Made in this category, so it shows as chosen once the list reloads. */}
      <ActivityCreateDialog
        open={isCreating}
        onClose={() => setIsCreating(false)}
        categoryId={category.id}
      />

      <CategoryActivityMovesDialog
        category={category}
        isOpen={isConfirming}
        movesIn={staged.toAdd}
        movesOut={movesOut}
        toDrafts={toDrafts}
        loading={staged.isApplying}
        onConfirm={(destinationId) => {
          setIsConfirming(false);
          void applyAll(destinationId);
        }}
        onClose={() => setIsConfirming(false)}
      />
    </>
  );
};
