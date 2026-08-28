"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Tags } from "lucide-react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useActivityCategoriesInfiniteQuery } from "@/hooks/useActivityCategories";
import { hasManagerAccess } from "@/lib/utils/user";

import { ActivityCategory } from "@/types";

import { ResourcePage } from "../shared/resourse/ResourcePage";
import { ActivityCategoryCard } from "./ActivityCategoryCard";
import { ActivityCategoryModal } from "./ActivityCategoryModal";
import { ActCategoryStatus } from "@/types/enums";

export function ActivityCategoriesContent() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [status, setStatus] = useState<ActCategoryStatus>(
    ActCategoryStatus.ACTIVE,
  );

  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get("onboarding") === "true";

  const { user } = useAuth();
  const canManage = hasManagerAccess(user?.role);

  const {
    items: categories,
    isLoading,
    isError,
    refetch,
    pagination,
  } = useActivityCategoriesInfiniteQuery({
    status,
  });

  const editingCategory = useMemo(
    () => categories.find((category) => category.id === editingCategoryId),
    [categories, editingCategoryId],
  );

  const handleTabChange = (tab: "active" | "archived") => {
    setStatus(
      tab === "archived"
        ? ActCategoryStatus.ARCHIVED
        : ActCategoryStatus.ACTIVE,
    );
  };

  return (
    <>
      <ResourcePage<ActivityCategory>
        title="Activity categories"
        description="Organize activities into categories for easier time tracking."
        items={categories}
        isLoading={isLoading}
        isError={isError || !canManage}
        onRetry={refetch}
        getSearchValue={(category) => category.name}
        searchPlaceholder="Search categories..."
        emptyTitle="No activity categories yet"
        emptyDescription="Create your first category to organize activities."
        emptyIcon={<Tags className="size-6" />}
        createLabel="Create category"
        onCreate={() => setCreateOpen(true)}
        canCreate={canManage}
        hasNextPage={pagination.hasNextPage}
        isFetchingNextPage={pagination.isFetchingNextPage}
        onFetchNextPage={pagination.fetchNextPage}
        tab={status === ActCategoryStatus.ARCHIVED ? "archived" : "active"}
        onTabChange={handleTabChange}
        renderItem={(category) => (
          <ActivityCategoryCard
            key={category.id}
            category={category}
            canManage={canManage}
            onView={(item) => setEditingCategoryId(item.id)}
          />
        )}
      />

      <ActivityCategoryModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        isOnboarding={isOnboarding}
      />

      <ActivityCategoryModal
        open={Boolean(editingCategory)}
        category={editingCategory}
        onClose={() => setEditingCategoryId(null)}
        isOnboarding={isOnboarding}
      />
    </>
  );
}
