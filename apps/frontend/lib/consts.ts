export const BACKEND_URL = "http://localhost:3001";

export const DAILY_TARGET_MINUTES = 8 * 60;
export const WEEKLY_TARGET_MINUTES = DAILY_TARGET_MINUTES * 5;

export const ROLE_LABELS = {
  administrator: "Administrator",
  manager: "Project Manager",
  employee: "Employee",
} as const;
