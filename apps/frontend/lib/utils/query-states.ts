type QueryState = {
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
};

/**
 * The queries a view can't draw without, as one state: loading while any
 * loads, failed when any failed, and a retry that reads them all again.
 */
export const combineQueryStates = (queries: QueryState[]) => ({
  isLoading: queries.some((query) => query.isLoading),
  hasError: queries.some((query) => query.isError),
  retry: () => queries.forEach((query) => void query.refetch()),
});
