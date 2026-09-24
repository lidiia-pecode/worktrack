/** What a manager without an active team is told on the invite form and the teams page. */
export const managerWithoutActiveTeamMessage = (hasArchivedTeams: boolean) =>
  hasArchivedTeams
    ? "Every team you lead is archived. An owner can restore one."
    : "You do not lead any team yet. An owner adds you to one.";
