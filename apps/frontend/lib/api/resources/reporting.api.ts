"use client";

import {
  HoursReport,
  HoursReportQuery,
  PeopleReportQuery,
  PeopleReport,
  ReportQuery,
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

  exportHours: (params: ReportQuery) =>
    client.download(`/hours/export${buildQueryString(params)}`),

  getPeopleReport: (params: PeopleReportQuery) =>
    client.get<PeopleReport>(`/people${buildQueryString(params)}`),

  /** The People report and its timeline, for owners and managers. */
  getOverview: (params: ReportQuery) =>
    client.get<ReportOverview>(`/overview${buildQueryString(params)}`),
};
