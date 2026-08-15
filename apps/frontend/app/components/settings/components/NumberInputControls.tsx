"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface NumberInputControlsProps {
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
}

export const NumberInputControls = ({
  onIncrement,
  onDecrement,
  disabled = false,
  className,
  buttonClassName,
}: NumberInputControlsProps) => {
  const buttonStyles = cn(
    "flex items-center justify-center",
    "h-2.5 w-6 rounded-xs",
    "bg-blue-600/60 text-white/60",
    "transition-colors",
    "hover:bg-blue-400 hover:text-white",
    "active:bg-blue-300",
    "disabled:pointer-events-none disabled:opacity-40",
    "md:cursor-pointer",
    buttonClassName,
  );

  return (
    <div
      className={cn("absolute right-2 bottom-3 flex flex-col gap-2", className)}
    >
      <button
        type="button"
        onClick={onIncrement}
        disabled={disabled}
        className={buttonStyles}
        aria-label="Increase value"
      >
        <ChevronUp className="w-4" />
      </button>

      <button
        type="button"
        onClick={onDecrement}
        disabled={disabled}
        className={buttonStyles}
        aria-label="Decrease value"
      >
        <ChevronDown className="w-4" />
      </button>
    </div>
  );
};
