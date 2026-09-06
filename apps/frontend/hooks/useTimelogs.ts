"use client";

import {
  TimeLog,
  TimeLogPayload,
  TimeLogsQuery,
  UpdateTimeLogPayload,
} from "@/types";

import { TimeLogsClientApi } from "@/lib/api/resources";

import { queryKeys } from "./shared/queryKeys";
import { createEntityQuery } from "./shared/createEntityQuery";
import { createEntityMutations } from "./shared/createEntityMutations";

type TimeLogQueryParams = Omit<TimeLogsQuery, "page">;

const timelogsQueries = createEntityQuery<TimeLog, TimeLogQueryParams>({
  queryKey: queryKeys.timelogs,
  api: {
    getAll: TimeLogsClientApi.getAll,
  },
});

export const useTimeLogsQuery = timelogsQueries.useQuery;

const useTimeLogsMutations = createEntityMutations<
  TimeLog,
  TimeLogPayload,
  UpdateTimeLogPayload,
  unknown
>({
  queryKey: queryKeys.timelogs.all,

  api: {
    create: TimeLogsClientApi.create,
    update: TimeLogsClientApi.update,
    delete: TimeLogsClientApi.delete,
  },

  messages: {
    create: "Time logged",
    update: "Entry updated",
    delete: "Entry deleted",
  },
});

export function useTimelogs(page = 1, params?: TimeLogQueryParams) {
  const query = useTimeLogsQuery(page, params);
  const actions = useTimeLogsMutations();

  return {
    ...query,
    actions,
  };
}
