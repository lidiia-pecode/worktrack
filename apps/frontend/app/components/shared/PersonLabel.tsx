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

/** A person in a week grid's first column: avatar, name, position and facts. */
export const PersonLabel = ({ user, children }: PersonLabelProps) => (
  <>
    <Avatar
      user={user}
      size="md"
      className={cn(isDeactivatedUser(user) && "opacity-60")}
    />

    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-medium text-foreground transition-colors group-hover:text-brand group-focus-visible:text-brand">
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
