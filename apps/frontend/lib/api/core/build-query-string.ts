// Turns query params into a search string

export const buildQueryString = (params?: object): string => {
  const search = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      search.set(key, String(value));
    }
  });

  const queryString = search.toString();

  return queryString ? `?${queryString}` : "";
};
