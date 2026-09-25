type QueryParams = Record<string, unknown>;

const createListKey = (entity: string, page: number, params?: QueryParams) =>
  [entity, "list", page, params ?? {}] as const;

const createInfiniteKey = (entity: string, params?: QueryParams) =>
  [entity, "infinite", params ?? {}] as const;

const createAllPagesKey = (entity: string, params?: QueryParams) =>
  [entity, "all-pages", params ?? {}] as const;

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

    allPages: (params?: QueryParams) => createAllPagesKey("teams", params),
  },

  projects: {
    all: ["projects"] as const,
    lists: () => ["projects", "list"] as const,

    list: (page: number, params?: QueryParams) =>
      createListKey("projects", page, params),

    infinite: (params?: QueryParams) => createInfiniteKey("projects", params),

    allPages: (params?: QueryParams) => createAllPagesKey("projects", params),

    detail: (id: string) => ["projects", "detail", id] as const,
  },

  activities: {
    all: ["activities"] as const,
    lists: () => ["activities", "list"] as const,

    list: (page: number, params?: QueryParams) =>
      createListKey("activities", page, params),

    infinite: (params?: QueryParams) => createInfiniteKey("activities", params),

    allPages: (params?: QueryParams) => createAllPagesKey("activities", params),
  },

  activityCategories: {
    all: ["activityCategories"] as const,
    lists: () => ["activityCategories", "list"] as const,

    list: (page: number, params?: QueryParams) =>
      createListKey("activityCategories", page, params),

    infinite: (params?: QueryParams) =>
      createInfiniteKey("activityCategories", params),

    allPages: (params?: QueryParams) =>
      createAllPagesKey("activityCategories", params),
  },

  users: {
    all: ["users"] as const,
    lists: () => ["users", "list"] as const,

    list: (page: number, params?: QueryParams) =>
      createListKey("users", page, params),

    infinite: (params?: QueryParams) => createInfiniteKey("users", params),

    allPages: (params?: QueryParams) => createAllPagesKey("users", params),

    detail: (id: string) => ["users", "detail", id] as const,

    assignable: {
      list: (page: number, params?: QueryParams) =>
        createListKey("users-assignable", page, params),

      infinite: (params?: QueryParams) =>
        createInfiniteKey("users-assignable", params),

      allPages: (params?: QueryParams) =>
        createAllPagesKey("users-assignable", params),
    },
  },

  absences: {
    all: ["absences"] as const,
    lists: () => ["absences", "list"] as const,

    list: (page: number, params?: QueryParams) =>
      createListKey("absences", page, params),

    infinite: (params?: QueryParams) => createInfiniteKey("absences", params),

    allPages: (params?: QueryParams) => createAllPagesKey("absences", params),
  },

  capacity: {
    all: ["capacity"] as const,

    expected: (params?: QueryParams) =>
      ["capacity", "expected", params ?? {}] as const,

    forUser: (userId: string) => ["capacity", "user", userId] as const,
  },

  timelogs: {
    all: ["timelogs"] as const,
    lists: () => ["timelogs", "list"] as const,

    list: (page: number, params?: QueryParams) =>
      createListKey("timelogs", page, params),

    infinite: (params?: QueryParams) => createInfiniteKey("timelogs", params),

    allPages: (params?: QueryParams) => createAllPagesKey("timelogs", params),

    teamSummary: (params?: QueryParams) =>
      ["timelogs", "team-summary", params ?? {}] as const,
  },

  planning: {
    all: ["planning"] as const,

    week: (params?: QueryParams) => ["planning", "week", params ?? {}] as const,

    list: (params?: QueryParams) => ["planning", "list", params ?? {}] as const,
  },

  reporting: {
    all: ["reporting"] as const,

    periods: (params?: QueryParams) =>
      ["reporting", "periods", params ?? {}] as const,

    periodHistory: () => ["reporting", "periods", "history"] as const,

    hours: (params?: QueryParams) =>
      ["reporting", "hours", params ?? {}] as const,

    plannedVsActual: (params?: QueryParams) =>
      ["reporting", "planned-vs-actual", params ?? {}] as const,

    utilisation: (params?: QueryParams) =>
      ["reporting", "utilisation", params ?? {}] as const,
  },

  projectActivities: {
    all: ["projectActivities"] as const,
    lists: () => ["projectActivities", "list"] as const,

    assignable: (params?: QueryParams) =>
      ["projectActivities", "assignable", params ?? {}] as const,
  },

  auth: {
    me: () => ["me"] as const,
  },

  invitations: {
    all: ["invitations"] as const,

    pending: () => ["invitations", "pending"] as const,

    validate: (token: string) => ["invitations", "validate", token] as const,
  },
};
