import { User } from "@/types";
import { Check } from "lucide-react";

export const UserPickerRow = ({
  user,
  selected,
  onToggle,
}: {
  user: User;
  selected: boolean;
  onToggle: () => void;
}) => {
  const initials = (u: User) =>
    `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();

  const fullName = (u: User) => `${u.firstName} ${u.lastName}`;

  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
        ${selected ? "bg-blue-50 text-blue-700" : "text-zinc-700 hover:bg-zinc-50"}`}
    >
      <div
        className={`size-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0
        ${selected ? "bg-blue-600 text-white" : "bg-gradient-to-br from-blue-400 to-indigo-500 text-white"}`}
      >
        {selected ? <Check size={14} /> : initials(user)}
      </div>
      <div className="flex flex-col items-start min-w-0">
        <span className="font-medium truncate">{fullName(user)}</span>
        {user.role && (
          <span className="text-xs text-zinc-400 truncate">{user.role}</span>
        )}
      </div>
    </button>
  );
};
