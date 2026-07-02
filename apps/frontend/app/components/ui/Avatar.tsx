import { User } from "@/types";
import { fullName, initials } from "../helpers";

type AvatarProps = { user: User; size?: "sm" | "md" };

export const Avatar = ({ user, size = "sm" }: AvatarProps) => {
  const sizeClass = size === "sm" ? "size-7 text-[10px]" : "size-6 text-[10px]";
  return (
    <div
      title={fullName(user)}
      className={`${sizeClass} rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white font-semibold flex items-center justify-center ring-2 ring-white shrink-0`}
    >
      {initials(user)}
    </div>
  );
};
