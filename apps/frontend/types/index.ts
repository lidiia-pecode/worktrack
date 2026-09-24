export * from "./Absence";
export * from "./Capacity";
export * from "./Project";
export * from "./Timelog";
export * from "./User";
export * from "./Activities";
export * from "./ActivityCategory";
export * from "./ProjectActivities";
export * from "./PlanningEntry";
export * from "./ReportingPeriod";
export * from "./HoursReport";
export * from "./PlannedVsActual";
export * from "./Utilisation";

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
}
