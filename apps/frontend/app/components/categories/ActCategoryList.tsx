"use client";

import { useState, useMemo } from "react";
import Container from "../layout/Container";
import { useAuth } from "@/hooks/useAuth";
import { useActivityCategories } from "@/hooks/useActivityCategories";
import { ActCategoryCard } from "./ActCategoryCard";
import { EntityList } from "../shared/EntityList";
import { ActCategoryStatus } from "@/types/enums";
import { LoadingState } from "../shared/LoadingState";
import { ErrorState } from "../shared/ErrorState";
import { EmptyState } from "../shared/EmptyState";
import { CreateActCategoryModal } from "./CreateActivityModal";
import { FilterBar } from "../shared/FilterBar";
import { Tags, Tag } from "lucide-react";
import { hasManagerAccess } from "@/lib/utils/user";

export const ActCategoryList = () => {
  const {
    items: categories,
    isLoading,
    isError,
    refetch,
  } = useActivityCategories();

  const { user } = useAuth();
  const canManage = hasManagerAccess(user?.role);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ActCategoryStatus>(
    "all",
  );

  const filtered = useMemo(() => {
    return categories.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [categories, search, statusFilter]);

  const archivedCount = useMemo(
    () =>
      categories.filter((c) => c.status === ActCategoryStatus.ARCHIVED).length,
    [categories],
  );

  if (isLoading) {
    return (
      <Container className="flex flex-col grow">
        <LoadingState
          title="Loading categories"
          description="Fetching your categories..."
        />
      </Container>
    );
  }

  if (isError || !canManage) {
    return (
      <Container className="flex flex-col grow">
        <ErrorState title="Couldn't load categories" onRetry={refetch} />
      </Container>
    );
  }

  if (!categories.length) {
    return (
      <Container className="flex flex-col grow">
        <EmptyState
          title="No categories yet"
          description="Create your first category."
          icon={<Tags className="h-8 w-8 text-muted-foreground" />}
          action={canManage && <CreateActCategoryModal />}
        />
      </Container>
    );
  }

  return (
    <Container className="flex flex-col grow">
      {canManage && <CreateActCategoryModal />}

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
                ? "No categories match your search"
                : "No categories in this status"
            }
            description={search ? "Try a different search term." : undefined}
            icon={<Tag className="h-8 w-8 text-muted-foreground" />}
          />
        </div>
      ) : (
        <EntityList
          items={filtered}
          renderItem={(category) => (
            <ActCategoryCard
              key={category.id}
              category={category}
              isAdmin={canManage}
            />
          )}
        />
      )}
    </Container>
  );
};
