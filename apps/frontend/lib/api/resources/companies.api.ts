"use client";

import { Company, UpdateCompanyPayload } from "@/types/Company";
import { createClient } from "../core";

const client = createClient({
  endpoint: "company",
});

export const CompaniesClientApi = {
  get: () => client.get<Company>(""),
  update: (data: UpdateCompanyPayload) => client.patch<Company>("", data),
};
