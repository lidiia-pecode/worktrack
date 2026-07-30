"use client";

import {
  GetTimelogsQuery,
  Timelog,
  TimelogListResponse,
  TimelogPayload,
  UpdateTimelogPayload,
} from "@/types";

import { createCrudClient } from "../core";

const crud = createCrudClient<
  Timelog,
  TimelogPayload,
  UpdateTimelogPayload,
  TimelogListResponse,
  GetTimelogsQuery
>({
  endpoint: "time-logs",
});

export const TimelogsClientApi = {
  ...crud,

  getAll: (query?: GetTimelogsQuery) => crud.getAll({ query }),
};
