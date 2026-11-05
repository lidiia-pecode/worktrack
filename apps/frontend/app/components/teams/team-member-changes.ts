import { formatDayMonthLabel } from "@/lib/utils/date";
import { nameOrCount } from "@/lib/utils/text";
import { fullName, isDeactivatedUser } from "@/lib/utils/user";
import { Team } from "@/types/Team";
import { UserTeam } from "@/types/User";
import { TeamRole } from "@/types/enums";

import {
  activeManagers,
  leftWithoutManagerText,
  MembershipWithUser,
} from "./team-memberships";

export type MemberChange =
  | { kind: "role"; membership: MembershipWithUser; roleInTeam: TeamRole }
  | { kind: "remove"; membership: MembershipWithUser };

/** How a team change's first day reads in a sentence. */
export interface ChangeDayWords {
  on: string;
  before: string;
  from: string;
  /** From today only records still to come move; from an earlier day, those already made too. */
  records: string;
}

const TODAY_WORDS: ChangeDayWords = {
  on: "today",
  before: "before today",
  from: "From today",
  records: "their new records",
};

export const changeDayWords = (date: string, today: string): ChangeDayWords => {
  if (date === today) return TODAY_WORDS;

  const day = formatDayMonthLabel(date);
  return {
    on: `on ${day}`,
    before: `before ${day}`,
    from: `From ${day}`,
    records: "their records",
  };
};

interface ChangeContext {
  isOwner: boolean;
  /** The person's other teams the viewer can see. */
  otherTeamsCount: number;
  /** The other team they are a member of, which making them a member here leaves. */
  otherMemberTeam?: Pick<UserTeam, "id" | "name"> | null;
  /** The day a removal takes effect, today by default. */
  day?: ChangeDayWords;
}

// A deactivated manager already leaves the team without an active one.
const isOnlyActiveManager = (team: Team, membership: MembershipWithUser) =>
  membership.roleInTeam === TeamRole.MANAGER &&
  !isDeactivatedUser(membership.user) &&
  activeManagers(team).every((manager) => manager.id === membership.user.id);

/** The confirmation's wording for a role change or a removal. */
export const memberChangeCopy = (
  change: MemberChange,
  team: Team,
  {
    isOwner,
    otherTeamsCount,
    otherMemberTeam,
    day = TODAY_WORDS,
  }: ChangeContext,
) => {
  const name = fullName(change.membership.user);
  const leavesNoManager = isOnlyActiveManager(team, change.membership)
    ? leftWithoutManagerText(team)
    : null;

  if (change.kind === "role" && change.roleInTeam === TeamRole.MANAGER) {
    return {
      title: `Make ${name} the manager of ${team.name}?`,
      description: `${name} can manage the team and access its time, absences and plans, including former members' records from their time in the team.`,
      confirmText: "Make manager",
    };
  }

  // A person is a member of one team, so this is a move.
  if (change.kind === "role" && otherMemberTeam) {
    return {
      title: `Move ${name} to ${team.name} as a member?`,
      description: [
        `${name} leaves ${otherMemberTeam.name} today and no longer sees ${team.name}'s members or their records. Their own records before today stay with ${otherMemberTeam.name}.`,
        leavesNoManager,
      ]
        .filter(Boolean)
        .join(" "),
      confirmText: "Move",
      confirmVariant: "warning" as const,
    };
  }

  if (change.kind === "role") {
    return {
      title: `Make ${name} a member of ${team.name}?`,
      description: [
        `They no longer see ${team.name}'s members.`,
        leavesNoManager,
      ]
        .filter(Boolean)
        .join(" "),
      confirmText: "Make member",
    };
  }

  // A team keeps its history: the days before the removal stay with it.
  const removal = isOwner
    ? [
        `${name} leaves ${team.name} ${day.on}. Their records from ${day.before} stay with the team.`,
        otherTeamsCount === 0 &&
          `${day.from}, only you can access ${day.records}.`,
      ]
    : [
        `${name} leaves the team ${day.on}. You can still access their records from ${day.before}.`,
        otherTeamsCount === 0 &&
          `${day.from}, only the owner can access ${day.records}.`,
      ];

  return {
    title: `Remove ${name} from ${team.name}?`,
    description: [...removal, leavesNoManager].filter(Boolean).join(" "),
    confirmText: "Remove",
    confirmVariant: "warning" as const,
  };
};

/** Someone the picker adds who is a member of another team, which they leave. */
export interface PickerMove {
  name: string;
  fromTeam: Pick<UserTeam, "id" | "name">;
}

interface PickerChanges {
  moves: PickerMove[];
  /** The names of the people taken off the team. */
  removals: string[];
  leavesNoManager: boolean;
}

/**
 * The one confirmation a picker's Done asks for: moves from other teams,
 * removals, or both at once.
 */
export const pickerChangesCopy = (
  team: Team,
  { moves, removals, leavesNoManager }: PickerChanges,
) => {
  const moved = nameOrCount(
    moves.map((move) => move.name),
    "people",
  );
  const removed = nameOrCount(removals, "people");
  const noManager = leavesNoManager ? leftWithoutManagerText(team) : null;

  const movesText =
    moves.length === 1
      ? `${moves[0].name} leaves ${moves[0].fromTeam.name} today. Their records before today stay with ${moves[0].fromTeam.name}.`
      : `They leave their current team today: ${moves
          .map((move) => `${move.name} (${move.fromTeam.name})`)
          .join(", ")}. Their records before today stay with those teams.`;

  if (moves.length === 0) {
    return {
      title: `Remove ${removed} from ${team.name}?`,
      description: ["They leave the team today.", noManager]
        .filter(Boolean)
        .join(" "),
      confirmText: "Remove",
      confirmVariant: "warning" as const,
    };
  }

  if (removals.length === 0) {
    return {
      title: `Move ${moved} to ${team.name}?`,
      description: [movesText, noManager].filter(Boolean).join(" "),
      confirmText: "Move",
      confirmVariant: "warning" as const,
    };
  }

  return {
    title: `Move ${moved} to ${team.name} and remove ${removed}?`,
    description: [
      movesText,
      `Removed from ${team.name} today: ${removals.join(", ")}.`,
      noManager,
    ]
      .filter(Boolean)
      .join(" "),
    confirmText: "Apply",
    confirmVariant: "warning" as const,
  };
};
