import { ReactNode } from "react";

import { TeamSummaryUser } from "@/types";
import { cn } from "@/lib/utils/cn";
import { fullName, isDeactivatedUser } from "@/lib/utils/user";

import { Avatar } from "./Avatar";

type PersonLabelProps = {
  user: TeamSummaryUser;
  /** Facts under the position in muted text, such as "Joined Oct 14 · Last day Oct 30". */
  children?: ReactNode;
};

/**
 * The action beside a person in a `group/person` cell. With a mouse it shows,
 * and takes its room, only while the person is hovered or it has focus; on
 * touch it always shows. Only colours transition: a fading opacity would
 * flash it over the avatar, where it waits hidden.
 */
export const PERSON_ACTION =
  "shrink-0 transition-colors pointer-fine:pointer-events-none pointer-fine:absolute pointer-fine:opacity-0 pointer-fine:group-hover/person:pointer-events-auto pointer-fine:group-hover/person:static pointer-fine:group-hover/person:opacity-100 pointer-fine:focus-visible:static pointer-fine:focus-visible:opacity-100";

/** A person in a week grid's first column: avatar, name, position and facts. */
export const PersonLabel = ({ user, children }: PersonLabelProps) => (
  <>
    <Avatar
      user={user}
      size="md"
      // No card-coloured ring: it would show on a tinted cell, such as Team
      // time's highlighted row.
      className={cn("ring-0", isDeactivatedUser(user) && "opacity-60")}
    />

    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-medium text-foreground">
        {fullName(user)}
      </span>

      {user.position && (
        <span className="block truncate text-xs text-muted-foreground">
          {user.position}
        </span>
      )}

      {children && (
        <span className="mt-1 block text-xs text-muted-foreground">
          {children}
        </span>
      )}
    </span>
  </>
);
