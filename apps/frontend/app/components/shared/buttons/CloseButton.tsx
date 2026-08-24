import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { X } from "lucide-react";

interface CloseButtonProps extends Omit<ButtonProps, "children"> {
  "aria-label"?: string;
}

export const CloseButton = ({
  className,
  variant = "ghost",
  size = "iconSm",
  "aria-label": ariaLabel = "Close",
  ...props
}: CloseButtonProps) => {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("aspect-square", className)}
      aria-label={ariaLabel}
      {...props}
    >
      <X aria-hidden="true" />
    </Button>
  );
};
