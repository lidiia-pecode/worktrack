"use client";

import {
  DeletePeriodPlansQuery,
  PaginatedResponse,
  PlanningEntry,
  PlanningQuery,
  PlanningRemovalCountQuery,
  PlanningWeek,
  PlanningWeekQuery,
  PeriodPreview,
  PlanPeriodPayload,
  PlannedPeriod,
} from "@/types";

import { buildQueryString, createClient } from "../core";

const client = createClient({ endpoint: "planning" });

export const PlanningClientApi = {
  getAll: (query: PlanningQuery) =>
    client.get<PaginatedResponse<PlanningEntry>>(buildQueryString(query)),

  delete: (id: string) => client.delete(`/${id}`),

  planPeriod: (payload: PlanPeriodPayload) =>
    client.post<PlannedPeriod>("/period", payload),

  previewPeriod: (payload: PlanPeriodPayload) =>
    client.post<PeriodPreview>("/period/preview", payload),

  deletePeriodPlans: (query: DeletePeriodPlansQuery) =>
    client.delete<{ count: number }>(`/period${buildQueryString(query)}`),

  getWeek: (params: PlanningWeekQuery) =>
    client.get<PlanningWeek>(`/week${buildQueryString(params)}`),

  countRemovable: ({ projectIds, userIds }: PlanningRemovalCountQuery) =>
    client.get<{ count: number }>(
      `/removal-count${buildQueryString({
        projectIds: projectIds.join(","),
        userIds: userIds.join(","),
      })}`,
    ),
};
