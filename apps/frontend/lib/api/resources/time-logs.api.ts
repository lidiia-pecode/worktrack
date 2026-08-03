"use client";

import {
  Timelog,
  TimelogListResponse,
  TimelogPayload,
  UpdateTimelogPayload,
} from "@/types";

import { createClient, createCrudClient } from "../core";

const crud = createCrudClient<
  Timelog,
  TimelogPayload,
  UpdateTimelogPayload,
  TimelogListResponse
>({
  endpoint: "time-logs",
});

const client = createClient({ endpoint: "time-logs" });

export const TimelogsClientApi = {
  ...crud,
  delete: (id: string) => client.delete(`/${id}`),
};
