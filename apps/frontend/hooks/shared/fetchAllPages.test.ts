import { describe, expect, it, vi } from "vitest";

import { fetchAllPages, MAX_PAGE_SIZE } from "./fetchAllPages";

/** A server holding `total` numbered rows. */
const serverWith = (total: number) =>
  vi.fn(async (page: number, pageSize: number) => {
    const start = (page - 1) * pageSize;
    const end = Math.min(start + pageSize, total);
    const results = Array.from({ length: end - start }, (_, i) => start + i);

    return { results, count: total };
  });

describe("fetchAllPages", () => {
  it("asks once when everything fits on the first page", async () => {
    const getPage = serverWith(3);

    await expect(fetchAllPages(getPage)).resolves.toEqual({
      results: [0, 1, 2],
      count: 3,
    });
    expect(getPage).toHaveBeenCalledTimes(1);
    expect(getPage).toHaveBeenCalledWith(1, MAX_PAGE_SIZE);
  });

  it("loads every page, in order", async () => {
    const total = MAX_PAGE_SIZE * 2 + 1;
    const getPage = serverWith(total);

    const { results, count } = await fetchAllPages(getPage);

    expect(getPage).toHaveBeenCalledTimes(3);
    expect(count).toBe(total);
    expect(results).toEqual(Array.from({ length: total }, (_, i) => i));
  });

  it("asks once for an empty list", async () => {
    const getPage = serverWith(0);

    await expect(fetchAllPages(getPage)).resolves.toEqual({
      results: [],
      count: 0,
    });
    expect(getPage).toHaveBeenCalledTimes(1);
  });
});
