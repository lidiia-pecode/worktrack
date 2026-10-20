"use client";

import {
  CreatePlanningEntryPayload,
  PaginatedResponse,
  PlanningEntry,
  PlanningQuery,
  PlanningRemovalCountQuery,
  PlanningWeek,
  PlanningWeekQuery,
  PeriodPreview,
  PlanPeriodPayload,
  PlannedPeriod,
  UpdatePlanningEntryPayload,
} from "@/types";

import { buildQueryString, createClient, createCrudClient } from "../core";

const crud = createCrudClient<
  PlanningEntry,
  CreatePlanningEntryPayload,
  UpdatePlanningEntryPayload,
  PaginatedResponse<PlanningEntry>,
  PlanningQuery
>({
  endpoint: "planning",
});

const client = createClient({ endpoint: "planning" });

export const PlanningClientApi = {
  ...crud,
  delete: (id: string) => client.delete(`/${id}`),

  planPeriod: (payload: PlanPeriodPayload) =>
    client.post<PlannedPeriod>("/period", payload),

  previewPeriod: (payload: PlanPeriodPayload) =>
    client.post<PeriodPreview>("/period/preview", payload),

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
