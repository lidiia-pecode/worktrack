import { Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/** The way back to the current week or month; on a phone, the icon alone. */
export const BackToNowButton = ({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) => (
  <Button
    variant="ghost"
    size="sm"
    className="w-auto bg-brand-subtle text-brand hover:bg-brand-muted hover:text-brand max-sm:size-10 max-sm:px-0"
    onClick={onClick}
  >
    <Undo2 className="size-3.5" aria-hidden />
    <span className="max-sm:sr-only">{label}</span>
  </Button>
);
