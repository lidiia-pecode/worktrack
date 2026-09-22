"use client";

import { ExpectedHours, ExpectedHoursQuery } from "@/types";

import { buildQueryString, createClient } from "../core";

const client = createClient({ endpoint: "capacity" });

export const CapacityClientApi = {
  getExpectedHours: (params: ExpectedHoursQuery) =>
    client.get<ExpectedHours>(`/expected${buildQueryString(params)}`),
};
