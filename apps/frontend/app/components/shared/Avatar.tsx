import { AvatarUser } from "@/types";
import { cn } from "@/lib/utils/cn";
import { fullName, initials } from "@/lib/utils/user";

const sizeClasses = {
  xs: "size-6 text-[10px]",
  sm: "size-7 text-[10px]",
  md: "size-9 text-xs",
  lg: "size-11 text-sm",
} as const;

interface AvatarProps {
  user: AvatarUser;
  size?: keyof typeof sizeClasses;
  className?: string;
}

export function Avatar({ user, size = "sm", className }: AvatarProps) {
  return (
    <div
      title={fullName(user)}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        "bg-gradient-to-br from-brand to-brand-secondary font-semibold text-brand-foreground",
        "ring-2 ring-card",
        sizeClasses[size],
        className,
      )}
    >
      {initials(user)}
    </div>
  );
}
