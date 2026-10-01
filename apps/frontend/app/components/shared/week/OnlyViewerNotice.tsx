import Link from "next/link";
import { Info } from "lucide-react";

import type { OnlyViewerReason } from "./only-viewer";

const INVITE_PEOPLE = {
  label: "Invite people",
  href: "/admin/users?create=true",
};

const NOTICES: Record<
  OnlyViewerReason,
  { text: string; action?: { label: string; href: string } }
> = {
  alone: { text: "Nobody else has joined yet.", action: INVITE_PEOPLE },
  noTeam: {
    text: "You don't lead a team yet. When you do, its people appear here.",
  },
  emptyTeam: {
    text: "Nobody has joined your team yet.",
    action: INVITE_PEOPLE,
  },
  emptyTeams: { text: "Nobody is in your teams yet.", action: INVITE_PEOPLE },
};

export const OnlyViewerNotice = ({ reason }: { reason: OnlyViewerReason }) => {
  const { text, action } = NOTICES[reason];

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-muted-foreground">
      <Info className="size-4 shrink-0 text-brand" aria-hidden="true" />
      {text}
      {action && (
        <Link
          href={action.href}
          className="font-medium text-brand hover:underline"
        >
          {action.label}
        </Link>
      )}
    </p>
  );
};
