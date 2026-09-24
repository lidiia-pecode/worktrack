import { PaginatedResponse } from "@/types";

/** The largest page the server returns. */
export const MAX_PAGE_SIZE = 100;

/**
 * Every row of a paginated list, for views that must never show part of one.
 * The first page gives the total, and the remaining pages load together.
 */
export async function fetchAllPages<T>(
  getPage: (page: number, pageSize: number) => Promise<PaginatedResponse<T>>,
): Promise<PaginatedResponse<T>> {
  const firstPage = await getPage(1, MAX_PAGE_SIZE);
  const pageCount = Math.ceil(firstPage.count / MAX_PAGE_SIZE);

  const remainingPageNumbers: number[] = [];
  for (let page = 2; page <= pageCount; page++) {
    remainingPageNumbers.push(page);
  }

  const remainingPages = await Promise.all(
    remainingPageNumbers.map((page) => getPage(page, MAX_PAGE_SIZE)),
  );

  return {
    ...firstPage,
    results: [firstPage, ...remainingPages].flatMap((page) => page.results),
  };
}
