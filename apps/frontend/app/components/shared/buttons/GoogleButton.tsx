"use client";

import Image from "next/image";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface GoogleButtonProps {
  onClick: () => void;
  className?: string;
  isLoading?: boolean;
  disabled?: boolean;
}

const GoogleButton = ({
  onClick,
  className,
  isLoading = false,
  disabled = false,
}: GoogleButtonProps) => {
  return (
    <Button
      onClick={onClick}
      isLoading={isLoading}
      disabled={disabled}
      className={cn(
        "w-full",
        "border border-action-dark/80",
        "bg-action-dark text-action-dark-foreground",
        "shadow-md shadow-action-dark/15",
        "hover:border-action-dark-hover",
        "hover:bg-action-dark-hover",
        "hover:text-action-dark-hover-foreground",
        className,
      )}
    >
      <Image
        src="/images/google-icon-logo.svg"
        alt="Google"
        width={18}
        height={18}
      />
      Continue with Google
    </Button>
  );
};
export { GoogleButton };
