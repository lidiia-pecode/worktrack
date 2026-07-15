import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type PickerRowProps = {
  selected: boolean;
  label: string;
  subtitle?: string;
  avatarText?: string;
  icon?: React.ReactNode;
  onToggle: () => void;
};

export function PickerRow({
  selected,
  label,
  subtitle,
  avatarText,
  icon,
  onToggle,
}: PickerRowProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
        selected
          ? "bg-blue-50 text-blue-700"
          : "hover:bg-zinc-50 text-zinc-700",
      )}
    >
      <div
        className={cn(
          "size-8 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-blue-400 to-indigo-500 text-white",
        )}
      >
        {selected ? <Check size={14} /> : icon || avatarText}
      </div>

      <div className="flex flex-col items-start min-w-0">
        <span className="font-medium truncate">{label}</span>

        {subtitle && (
          <span className="text-xs text-zinc-400 truncate">{subtitle}</span>
        )}
      </div>
    </button>
  );
}
