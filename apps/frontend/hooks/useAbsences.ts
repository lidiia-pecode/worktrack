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

export const useAllAbsencesQuery = absencesQueries.useAllPagesQuery;

const useAbsencesMutations = createEntityMutations<
  Absence,
  AbsencePayload,
  UpdateAbsencePayload,
  unknown
>({
  queryKey: queryKeys.absences.all,

  // Days away are an input to Expected, which the server works out — so the
  // week views have to re-read it, not just the absence list.
  alsoInvalidate: [queryKeys.capacity.all, queryKeys.timelogs.all],

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

export function useAbsences(params?: AbsenceQueryParams) {
  const query = useAllAbsencesQuery(params);
  const actions = useAbsencesMutations();

  return {
    ...query,
    actions,
  };
}
