export * from "./Project";
export * from "./Timelog";
export * from "./User";
export * from "./Activities";
export * from "./ActivityCategory";
export * from "./ProjectActivities";

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}
