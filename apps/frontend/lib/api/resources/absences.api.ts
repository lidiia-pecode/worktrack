"use client";

import {
  Absence,
  AbsenceDay,
  AbsenceDayQuery,
  AbsenceDeleteResult,
  AbsenceListResponse,
  AbsencePayload,
  AbsencesQuery,
  UpdateAbsencePayload,
} from "@/types";

import { buildQueryString, createClient, createCrudClient } from "../core";

const crud = createCrudClient<
  Absence,
  AbsencePayload,
  UpdateAbsencePayload,
  AbsenceListResponse,
  AbsencesQuery
>({
  endpoint: "absences",
});

const client = createClient({ endpoint: "absences" });

export const AbsencesClientApi = {
  ...crud,
  delete: (id: string) => client.delete<AbsenceDeleteResult>(`/${id}`),
  getDay: (query: AbsenceDayQuery) =>
    client.get<AbsenceDay>(`/day${buildQueryString(query)}`),
};
