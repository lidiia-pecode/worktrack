"use client";

import {
  HoursReport,
  HoursReportQuery,
  PeopleReport,
  ReportRange,
  ReportingMonth,
  ReportingPeriodsQuery,
  ReportOverview,
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

  exportHours: (params: ReportRange) =>
    client.download(`/hours/export${buildQueryString(params)}`),

  getPeopleReport: (params: ReportRange) =>
    client.get<PeopleReport>(`/people${buildQueryString(params)}`),

  /** The People report and its timeline, for owners and managers. */
  getOverview: (params: ReportRange) =>
    client.get<ReportOverview>(`/overview${buildQueryString(params)}`),
};
