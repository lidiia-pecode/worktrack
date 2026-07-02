import { User } from "@/types";
import { X } from "lucide-react";
import { fullName, initials } from "../../helpers";

type AvatarProps = { user: User; size?: "sm" | "md" };

function Avatar({ user, size = "sm" }: AvatarProps) {
  const sizeClass = size === "sm" ? "size-7 text-[10px]" : "size-6 text-[10px]";
  return (
    <div
      title={fullName(user)}
      className={`${sizeClass} rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white font-semibold flex items-center justify-center ring-2 ring-white shrink-0`}
    >
      {initials(user)}
    </div>
  );
}

export const MemberChip = ({
  user,
  onRemove,
}: {
  user: User;
  onRemove?: () => void;
}) => {
  return (
    <div className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-zinc-50 border border-zinc-200 hover:border-zinc-300 transition-colors">
      <Avatar user={user} size="md" />
      <span className="text-sm text-zinc-700 whitespace-nowrap">
        {fullName(user)}
      </span>
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={`Remove ${fullName(user)}`}
          className="ml-0.5 text-zinc-300 hover:text-zinc-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-full"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
};
