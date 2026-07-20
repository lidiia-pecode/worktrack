"use client";

import { createCrudApi } from "../createCrudApi";

import {
  ActivityCategory,
  ActivityCategoryPayload,
  ActivityCategoryListResponse,
  UpdateActivityCategoryPayload,
} from "@/types/ActivityCategory";

export const ActivityCategoriesClientApi = createCrudApi<
  ActivityCategory,
  ActivityCategoryPayload,
  UpdateActivityCategoryPayload,
  ActivityCategoryListResponse
>({
  endpoint: "activity-categories",
});
