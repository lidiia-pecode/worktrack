"use client";

import { TeamsClientApi } from "@/lib/api/resources/teams";
import { createEntityMutations } from "./shared/createEntityMutations";
import { queryKeys } from "./shared/queryKeys";

export const useTeamMutations = createEntityMutations({
  queryKey: queryKeys.teams.all,
  api: {
    create: TeamsClientApi.create,
    update: TeamsClientApi.update,
    archive: TeamsClientApi.archive,
  },
  messages: {
    create: "Team created successfully!",
    update: "Team updated successfully!",
    archive: "Team archived successfully!",
  },
});
