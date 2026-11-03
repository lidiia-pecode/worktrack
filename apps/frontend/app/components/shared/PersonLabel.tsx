import { ReactNode } from "react";

import { TeamSummaryUser } from "@/types";
import { fullName } from "@/lib/utils/user";

import { Avatar } from "./Avatar";

type PersonLabelProps = {
  user: TeamSummaryUser;
  /** Notes under the name, such as badges. */
  children?: ReactNode;
};

export const PersonLabel = ({ user, children }: PersonLabelProps) => (
  <>
    <Avatar user={user} />

    <span className="min-w-0">
      <span className="block truncate text-sm font-medium text-foreground transition-colors group-hover:text-brand group-focus-visible:text-brand">
        {fullName(user)}
      </span>

      {user.position && (
        <span className="block truncate text-xs text-muted-foreground">
          {user.position}
        </span>
      )}

      {children && (
        <span className="mt-1 flex flex-wrap gap-1">{children}</span>
      )}
    </span>
  </>
);
