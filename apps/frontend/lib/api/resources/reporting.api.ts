"use client";

import {
  HoursReport,
  HoursReportQuery,
  PlannedVsActualQuery,
  PlannedVsActualReport,
  ReportingMonth,
  ReportingPeriodsQuery,
} from "@/types";

import { buildQueryString, createClient } from "../core";

const client = createClient({ endpoint: "reporting" });

export const ReportingClientApi = {
  getPeriods: (params: ReportingPeriodsQuery = {}) =>
    client.get<ReportingMonth[]>(`/periods${buildQueryString(params)}`),

  reopenPeriod: (month: string) =>
    client.post<ReportingMonth>(`/periods/${month}/reopen`),

  closePeriod: (month: string) =>
    client.post<ReportingMonth>(`/periods/${month}/close`),

  getHoursReport: (params: HoursReportQuery) =>
    client.get<HoursReport>(`/hours${buildQueryString(params)}`),

  getPlannedVsActual: (params: PlannedVsActualQuery) =>
    client.get<PlannedVsActualReport>(
      `/planned-vs-actual${buildQueryString(params)}`,
    ),
};
