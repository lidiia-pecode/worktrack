"use client";

import {
  Absence,
  AbsenceListResponse,
  AbsencePayload,
  AbsencesQuery,
  UpdateAbsencePayload,
} from "@/types";

import { createClient, createCrudClient } from "../core";

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
  delete: (id: string) => client.delete(`/${id}`),
};
