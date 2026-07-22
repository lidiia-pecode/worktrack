import { X } from "lucide-react";

type MemberChipProps = {
  label: string;
  avatar: string;
  onRemove?: () => void;
};

export const MemberChip = ({ label, avatar, onRemove }: MemberChipProps) => {
  return (
    <div
      className="
        flex items-center gap-2
        rounded-full
        border border-zinc-200
        bg-white
        py-1 pl-1 pr-2
        shadow-sm
        transition-all
        hover:border-zinc-300
        hover:shadow
      "
    >
      <div
        title={label}
        className="
          flex size-7 shrink-0 items-center justify-center
          rounded-full
          bg-gradient-to-br from-blue-400 to-indigo-500
          text-[10px] font-semibold text-white
        "
      >
        {avatar}
      </div>

      <span className="max-w-[180px] truncate text-sm font-medium text-zinc-700">
        {label}
      </span>

      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="
            rounded-full
            p-0.5
            text-zinc-300
            transition-colors
            hover:text-zinc-600
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-blue-500
          "
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
};
