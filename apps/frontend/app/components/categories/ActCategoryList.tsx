"use client";

import { useState } from "react";
import Pagination from "../ui/Pagination";
import Container from "../layout/Container";
import { useMe } from "@/hooks/useMe";
import { useActivityCategories } from "@/hooks/useActivityCategories";
import { ActCategoryCard } from "./ActCategoryCard";
import { EntityList } from "../ui/EntityList";
import { UserRole } from "@/types/enums";
import { LoadingState } from "../ui/LoadingState";
import { ErrorState } from "../ui/ErrorState";
import { EmptyState } from "../ui/EmptyState";
import { CreateActCategoryModal } from "./CreateActivityModal";

const PAGE_SIZE = 6;

export const ActCategoryList = () => {
  const [page, setPage] = useState(1);
  const {
    items: categories,
    count,
    isLoading,
    isError,
    refetch,
  } = useActivityCategories();
  // const { data, isLoading, error, refetch } = useActivityCategories(page);
  const me = useMe();
  const currentUserRole = me.data?.role;
  const isAdmin =
    currentUserRole === UserRole.ADMIN ||
    currentUserRole === UserRole.SUPER_ADMIN;

  // const categories: ActivityCategory[] = data?.results ?? [];
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  const handlePageChange = (pageNumber: number) => {
    setPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isLoading) {
    return (
      <LoadingState
        title="Loading categories"
        description="Fetching your categories..."
      />
    );
  }

  if (isError || !isAdmin) {
    return <ErrorState title="Couldn't load categories" onRetry={refetch} />;
  }

  if (!categories.length) {
    return (
      <EmptyState
        title="No categories yet"
        description="Create your first category."
        action={isAdmin && <CreateActCategoryModal />}
      />
    );
  }

  return (
    <Container className="flex flex-col grow">
      {isAdmin && <CreateActCategoryModal />}

      <EntityList
        items={categories}
        renderItem={(category) => (
          <ActCategoryCard
            key={category.id}
            category={category}
            isAdmin={isAdmin}
          />
        )}
      />

      <div className="mt-8 flex justify-center">
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>
    </Container>
  );
};
