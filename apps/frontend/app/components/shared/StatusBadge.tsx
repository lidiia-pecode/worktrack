import { Status } from "@/types/enums";

type StatusBadgeProps = {
  status: Status;
  size?: "sm" | "md";
};

export const StatusBadge = ({ status, size = "sm" }: StatusBadgeProps) => {
  const isActive = status === Status.ACTIVE;

  return (
    <span
      className={`
        inline-flex items-center gap-2 rounded-full font-medium
        ${size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm"}
        ${
          isActive
            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
            : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
        }
      `}
    >
      <span
        className={`
          size-2 rounded-full
          ${isActive ? "bg-emerald-500" : "bg-amber-500"}
        `}
      />

      {isActive ? "Active" : "Archived"}
    </span>
  );
};
