"use client";

import {
  DeletePeriodPlansQuery,
  PaginatedResponse,
  PlanningEntry,
  PlanningQuery,
  PlanningRemovalCountQuery,
  PlanningMonth,
  PlanningWeek,
  PlanningPeriodQuery,
  PeriodPreview,
  PlanPeriodPayload,
  PlannedPeriod,
} from "@/types";

import { buildQueryString, createClient } from "../core";

const client = createClient({ endpoint: "planning" });

export const PlanningClientApi = {
  getAll: (query: PlanningQuery) =>
    client.get<PaginatedResponse<PlanningEntry>>(buildQueryString(query)),

  planPeriod: (payload: PlanPeriodPayload) =>
    client.post<PlannedPeriod>("/period", payload),

  previewPeriod: (payload: PlanPeriodPayload) =>
    client.post<PeriodPreview>("/period/preview", payload),

  deletePeriodPlans: (query: DeletePeriodPlansQuery) =>
    client.delete<{ count: number }>(`/period${buildQueryString(query)}`),

  getWeek: (params: PlanningPeriodQuery) =>
    client.get<PlanningWeek>(`/week${buildQueryString(params)}`),

  getMonth: (params: PlanningPeriodQuery) =>
    client.get<PlanningMonth>(`/month${buildQueryString(params)}`),

  countRemovable: ({ projectIds, userIds }: PlanningRemovalCountQuery) =>
    client.get<{ count: number }>(
      `/removal-count${buildQueryString({
        projectIds: projectIds.join(","),
        userIds: userIds.join(","),
      })}`,
    ),
};
