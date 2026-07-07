import { ProjectStatus } from "@/types/enums";

type StatusBadgeProps = {
  status: ProjectStatus;
  size?: "sm" | "md";
};

export const StatusBadge = ({ status, size = "sm" }: StatusBadgeProps) => {
  const isActive = status === ProjectStatus.ACTIVE;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium tracking-wide
        ${size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm"}
        ${
          isActive
            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
            : "bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200"
        }`}
    >
      <span
        className={`size-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-zinc-400"}`}
      />
      {status}
    </span>
  );
};
