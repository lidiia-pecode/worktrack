"use client";

import {
  HoursExportQuery,
  HoursReport,
  HoursReportQuery,
  PlannedVsActualQuery,
  PlannedVsActualReport,
  ReportingMonth,
  ReportingPeriodsQuery,
  UtilisationQuery,
  UtilisationReport,
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

  exportHours: (params: HoursExportQuery) =>
    client.download(`/hours/export${buildQueryString(params)}`),

  getPlannedVsActual: (params: PlannedVsActualQuery) =>
    client.get<PlannedVsActualReport>(
      `/planned-vs-actual${buildQueryString(params)}`,
    ),

  getUtilisation: (params: UtilisationQuery) =>
    client.get<UtilisationReport>(`/utilisation${buildQueryString(params)}`),
};
