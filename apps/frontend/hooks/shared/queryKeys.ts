type QueryParams = Record<string, unknown>;

const createListKey = (entity: string, page: number, params?: QueryParams) =>
  [entity, "list", page, params ?? {}] as const;

const createInfiniteKey = (entity: string, params?: QueryParams) =>
  [entity, "infinite", params ?? {}] as const;

export const queryKeys = {
  company: {
    current: ["company"] as const,
  },

  onboarding: {
    ownerSetup: () => ["onboarding", "owner-setup"] as const,

    managerSetup: () => ["onboarding", "manager-setup"] as const,
  },

  teams: {
    all: ["teams"] as const,

    lists: () => ["teams", "list"] as const,

    list: (page: number, params?: QueryParams) =>
      createListKey("teams", page, params),

    infinite: (params?: QueryParams) => createInfiniteKey("teams", params),
  },

  projects: {
    all: ["projects"] as const,

    lists: () => ["projects", "list"] as const,

    list: (page: number, params?: QueryParams) =>
      createListKey("projects", page, params),

    infinite: (params?: QueryParams) => createInfiniteKey("projects", params),
  },

  activities: {
    all: ["activities"] as const,

    lists: () => ["activities", "list"] as const,

    list: (page: number, params?: QueryParams) =>
      createListKey("activities", page, params),

    infinite: (params?: QueryParams) => createInfiniteKey("activities", params),
  },

  activityCategories: {
    all: ["activityCategories"] as const,

    lists: () => ["activityCategories", "list"] as const,

    list: (page: number, params?: QueryParams) =>
      createListKey("activityCategories", page, params),

    infinite: (params?: QueryParams) =>
      createInfiniteKey("activityCategories", params),
  },

  users: {
    all: ["users"] as const,

    lists: () => ["users", "list"] as const,

    list: (page: number, params?: QueryParams) =>
      createListKey("users", page, params),

    infinite: (params?: QueryParams) => createInfiniteKey("users", params),

    detail: (id: string) => ["users", "detail", id] as const,
  },

  timelogs: {
    all: ["timelogs"] as const,

    lists: () => ["timelogs", "list"] as const,

    list: (dateFrom: string, dateTo: string) =>
      ["timelogs", "list", dateFrom, dateTo] as const,
  },

  projectActivities: {
    all: ["projectActivities"] as const,

    lists: () => ["projectActivities", "list"] as const,
  },

  auth: {
    me: () => ["me"] as const,
  },

  invitations: {
    all: ["invitations"] as const,

    validate: (token: string) => ["invitations", "validate", token] as const,
  },
};
