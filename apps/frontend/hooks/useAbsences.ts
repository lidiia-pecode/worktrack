"use client";

import { Absence, AbsencesQuery } from "@/types";

import { AbsencesClientApi } from "@/lib/api/resources";

import { queryKeys } from "./shared/queryKeys";
import { createEntityQuery } from "./shared/createEntityQuery";

type AbsenceQueryParams = Omit<AbsencesQuery, "page">;

const absencesQueries = createEntityQuery<Absence, AbsenceQueryParams>({
  queryKey: queryKeys.absences,
  api: {
    getAll: AbsencesClientApi.getAll,
  },

  keepPreviousData: true,
});

export const useAbsencesQuery = absencesQueries.useQuery;
