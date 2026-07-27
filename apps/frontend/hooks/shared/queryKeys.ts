export const queryKeys = {
  projects: {
    all: ["projects"] as const,

    lists: () => [...queryKeys.projects.all, "list"] as const,

    list: (page: number) => [...queryKeys.projects.lists(), page] as const,

    detail: (id: string) => [...queryKeys.projects.all, "detail", id] as const,

    picker: () => [...queryKeys.projects.all, "picker"] as const,
  },

  activities: {
    all: ["activities"] as const,

    lists: () => [...queryKeys.activities.all, "list"] as const,

    list: (page: number) => [...queryKeys.activities.lists(), page] as const,

    infinite: () => [...queryKeys.activities.all, "infinite"] as const,

    detail: (id: string) =>
      [...queryKeys.activities.all, "detail", id] as const,
  },

  activityCategories: {
    all: ["activityCategories"] as const,

    lists: () => [...queryKeys.activityCategories.all, "list"] as const,

    list: (page: number) =>
      [...queryKeys.activityCategories.lists(), page] as const,

    detail: (id: string) =>
      [...queryKeys.activityCategories.all, "detail", id] as const,
  },

  users: {
    all: ["users"] as const,

    infinite: () => [...queryKeys.users.all, "infinite"] as const,

    detail: (id: string) => [...queryKeys.users.all, "detail", id] as const,
  },

  timelogs: {
    all: ["timelogs"] as const,

    lists: () => [...queryKeys.timelogs.all, "list"] as const,

    list: (dateFrom: string, dateTo: string) =>
      [...queryKeys.timelogs.lists(), dateFrom, dateTo] as const,
  },

  projectActivities: {
    all: ["projectActivities"] as const,

    lists: () => [...queryKeys.projectActivities.all, "list"] as const,

    list: (projectId: string) =>
      [...queryKeys.projectActivities.lists(), projectId] as const,
  },

  auth: {
    me: () => ["me"] as const,
  },
};
