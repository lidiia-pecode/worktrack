import { TeamSummaryUser } from "@/types";
import { fullName } from "@/lib/utils/user";

import { Avatar } from "./Avatar";

type PersonLabelProps = {
  user: TeamSummaryUser;
};

export const PersonLabel = ({ user }: PersonLabelProps) => (
  <>
    <Avatar user={user} />

    <span className="min-w-0">
      <span className="block truncate text-sm font-medium text-foreground">
        {fullName(user)}
      </span>

      {user.position && (
        <span className="block truncate text-xs text-muted-foreground">
          {user.position}
        </span>
      )}
    </span>
  </>
);
