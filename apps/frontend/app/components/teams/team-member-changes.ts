import { formatDayMonthLabel } from "@/lib/utils/date";
import { nameOrCount } from "@/lib/utils/text";
import { fullName, isDeactivatedUser } from "@/lib/utils/user";
import { Team } from "@/types/Team";
import { UserTeam } from "@/types/User";
import { TeamRole } from "@/types/enums";

import { leftWithoutManagerText, MembershipWithUser } from "./team-memberships";

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

interface RemovalContext {
  isOwner: boolean;
  /** The day a removal takes effect, today by default. */
  day?: ChangeDayWords;
}

/**
 * The confirmation for taking someone off a team. A person is in one team, so
 * they are then in none: only the owner reaches what they record next.
 */
export const removalCopy = (
  membership: MembershipWithUser,
  team: Team,
  { isOwner, day = TODAY_WORDS }: RemovalContext,
) => {
  const name = fullName(membership.user);
  // A deactivated manager already leaves the team without an active one.
  const leavesNoManager =
    membership.roleInTeam === TeamRole.MANAGER &&
    !isDeactivatedUser(membership.user)
      ? leftWithoutManagerText(team)
      : null;

  // A team keeps its history: the days before the removal stay with it.
  const removal = isOwner
    ? [
        `${name} leaves ${team.name} ${day.on}. Their records from ${day.before} stay with the team.`,
        `${day.from}, only you can access ${day.records}.`,
      ]
    : [
        `${name} leaves the team ${day.on}. You can still access their records from ${day.before}.`,
        `${day.from}, only the owner can access ${day.records}.`,
      ];

  return {
    title: `Remove ${name} from ${team.name}?`,
    description: [...removal, leavesNoManager].filter(Boolean).join(" "),
    confirmText: "Remove",
    confirmVariant: "warning" as const,
  };
};

/** Someone the picker adds who is in another team, which they leave. */
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
