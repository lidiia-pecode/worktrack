"use client";

import { useState, useMemo } from "react";
import Container from "../layout/Container";
import { useMe } from "@/hooks/useMe";
import { useActivityCategories } from "@/hooks/useActivityCategories";
import { ActCategoryCard } from "./ActCategoryCard";
import { EntityList } from "../shared/EntityList";
import { UserRole, Status } from "@/types/enums";
import { LoadingState } from "../shared/LoadingState";
import { ErrorState } from "../shared/ErrorState";
import { EmptyState } from "../shared/EmptyState";
import { CreateActCategoryModal } from "./CreateActivityModal";
import { FilterBar } from "../shared/FilterBar";
import { Tags, Tag } from "lucide-react";

export const ActCategoryList = () => {
  const {
    items: categories,
    isLoading,
    isError,
    refetch,
  } = useActivityCategories();
  const me = useMe();
  const currentUserRole = me.data?.role;
  const isAdmin =
    currentUserRole === UserRole.ADMIN ||
    currentUserRole === UserRole.SUPER_ADMIN;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");

  const filtered = useMemo(() => {
    return categories.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [categories, search, statusFilter]);

  const archivedCount = useMemo(
    () => categories.filter((c) => c.status === Status.ARCHIVED).length,
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

  if (isError || !isAdmin) {
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
          action={isAdmin && <CreateActCategoryModal />}
        />
      </Container>
    );
  }

  return (
    <Container className="flex flex-col grow">
      {isAdmin && <CreateActCategoryModal />}

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
              isAdmin={isAdmin}
            />
          )}
        />
      )}
    </Container>
  );
};
