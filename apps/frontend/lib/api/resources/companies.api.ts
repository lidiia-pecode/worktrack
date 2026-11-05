"use client";

import {
  Company,
  StandardDayChange,
  UpdateCompanyPayload,
} from "@/types/Company";
import { createClient } from "../core";

const client = createClient({
  endpoint: "company",
});

export const CompaniesClientApi = {
  get: () => client.get<Company>(""),
  update: (data: UpdateCompanyPayload) => client.patch<Company>("", data),

  setStandardDay: (data: StandardDayChange) =>
    client.post<Company>("/standard-day", data),

  cancelStandardDayChange: (validFrom: string) =>
    client.delete<Company>(`/standard-day/changes/${validFrom}`),
};
