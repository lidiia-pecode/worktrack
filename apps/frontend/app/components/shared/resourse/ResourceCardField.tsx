import { ReactNode } from "react";

interface ResourceCardFieldProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}

export function ResourceCardField({
  label,
  value,
  icon,
}: ResourceCardFieldProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
        {icon}

        <span className="text-xs">{label}</span>
      </div>

      <span className="truncate text-sm font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}
