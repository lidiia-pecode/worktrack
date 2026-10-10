"use client";

import { Badge } from "@/components/ui/badge";
import { useActivityCategoryDetails } from "@/hooks/useActivityCategories";
import { ActivityStatus } from "@/types/enums";

import { EntityLink } from "../entity-panel/EntityLink";
import {
  EntityPanelLayout,
  PanelList,
  PanelQueryState,
  PanelStatus,
} from "../entity-panel/EntityPanelLayout";
import { isActiveCategory, useCategoryActions } from "./useCategoryActions";

export const CategoryPanel = ({ id }: { id: string }) => {
  const {
    data: category,
    isLoading,
    error,
    refetch,
  } = useActivityCategoryDetails(id);
  const categoryActions = useCategoryActions();

  if (!category) {
    return (
      <PanelQueryState isLoading={isLoading} error={error} onRetry={refetch} />
    );
  }

  return (
    <>
      <EntityPanelLayout
        name={category.name}
        status={<PanelStatus isActive={isActiveCategory(category)} />}
        onEdit={
          categoryActions.canEdit(category)
            ? () => categoryActions.edit(category)
            : undefined
        }
        actions={categoryActions.actionsFor(category)}
      >
        <PanelList
          title="Activities"
          items={category.activities}
          getKey={(activity) => activity.id}
          renderRow={(activity) => ({
            label: (
              <EntityLink entity={{ type: "activity", id: activity.id }}>
                {activity.name}
              </EntityLink>
            ),
            badge: activity.status === ActivityStatus.ARCHIVED && (
              <Badge variant="neutral">Archived</Badge>
            ),
          })}
          emptyText="No activities in it yet."
        />
      </EntityPanelLayout>

      {categoryActions.dialogs}
    </>
  );
};
