import { TeamMove } from "@/types";
import { moveLabel } from "@/lib/utils/user";

import { Badge } from "@/components/ui/badge";

/** Where a person joined or left the team in view, under their name. */
export const MoveBadges = ({ moves }: { moves: TeamMove[] }) =>
  moves.map((move) => (
    <Badge
      key={`${move.direction}-${move.date}`}
      variant="neutral"
      size="sm"
      className="whitespace-nowrap"
    >
      {moveLabel(move)}
    </Badge>
  ));
