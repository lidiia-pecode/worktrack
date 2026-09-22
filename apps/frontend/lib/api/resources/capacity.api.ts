"use client";

import {
  Capacity,
  ExpectedHours,
  ExpectedHoursQuery,
  SetCapacityPayload,
} from "@/types";

import { buildQueryString, createClient } from "../core";

const client = createClient({ endpoint: "capacity" });

export const CapacityClientApi = {
  getExpectedHours: (params: ExpectedHoursQuery) =>
    client.get<ExpectedHours>(`/expected${buildQueryString(params)}`),

  getForUser: (userId: string) => client.get<Capacity>(`/users/${userId}`),

  setForUser: (data: SetCapacityPayload) => client.post<Capacity>("", data),
};
