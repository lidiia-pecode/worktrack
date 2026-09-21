"use client";

import {
  Absence,
  AbsencePayload,
  AbsencesQuery,
  UpdateAbsencePayload,
} from "@/types";

import { AbsencesClientApi } from "@/lib/api/resources";

import { queryKeys } from "./shared/queryKeys";
import { createEntityQuery } from "./shared/createEntityQuery";
import { createEntityMutations } from "./shared/createEntityMutations";

type AbsenceQueryParams = Omit<AbsencesQuery, "page">;

const absencesQueries = createEntityQuery<Absence, AbsenceQueryParams>({
  queryKey: queryKeys.absences,
  api: {
    getAll: AbsencesClientApi.getAll,
  },

  keepPreviousData: true,
});

export const useAbsencesQuery = absencesQueries.useQuery;

const useAbsencesMutations = createEntityMutations<
  Absence,
  AbsencePayload,
  UpdateAbsencePayload,
  unknown
>({
  queryKey: queryKeys.absences.all,

  api: {
    create: AbsencesClientApi.create,
    update: AbsencesClientApi.update,
    delete: AbsencesClientApi.delete,
  },

  messages: {
    create: "Absence recorded",
    update: "Absence updated",
    delete: "Absence removed",
  },
});

export function useAbsences(page = 1, params?: AbsenceQueryParams) {
  const query = useAbsencesQuery(page, params);
  const actions = useAbsencesMutations();

  return {
    ...query,
    actions,
  };
}
