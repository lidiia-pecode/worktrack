"use client";

import {
  TeamSummary,
  TeamSummaryQuery,
  TimeLog,
  TimeLogListResponse,
  TimeLogPayload,
  TimeLogsQuery,
  UpdateTimeLogPayload,
} from "@/types";

import { buildQueryString, createClient, createCrudClient } from "../core";

const crud = createCrudClient<
  TimeLog,
  TimeLogPayload,
  UpdateTimeLogPayload,
  TimeLogListResponse,
  TimeLogsQuery
>({
  endpoint: "time-logs",
});

const client = createClient({ endpoint: "time-logs" });

export const TimeLogsClientApi = {
  ...crud,
  delete: (id: string) => client.delete(`/${id}`),

  getTeamSummary: (params: TeamSummaryQuery) =>
    client.get<TeamSummary>(`/summary${buildQueryString(params)}`),
};
