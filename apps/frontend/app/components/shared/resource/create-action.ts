interface CreateActionState {
  canCreate: boolean;
  isLoading: boolean;
  isError: boolean;
  itemCount: number;
  isSearching: boolean;
}

/**
 * One create button per page. While the list is truly empty the empty state
 * holds it, next to the text that explains the thing; otherwise the header
 * does. Hidden while loading, so it never appears only to move.
 */
export const createActionPlacement = ({
  canCreate,
  isLoading,
  isError,
  itemCount,
  isSearching,
}: CreateActionState): "header" | "emptyState" | null => {
  if (!canCreate || isLoading) return null;
  if (!isError && itemCount === 0 && !isSearching) return "emptyState";

  return "header";
};
