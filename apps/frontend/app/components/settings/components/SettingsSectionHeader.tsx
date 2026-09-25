import type { LucideIcon } from "lucide-react";

interface SettingsSectionHeaderProps {
  icon?: LucideIcon;
  title: string;
  description: string;
}

export const SettingsSectionHeader = ({
  icon: Icon,
  title,
  description,
}: SettingsSectionHeaderProps) => {
  return (
    <div className="border-b border-border px-6 py-5">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-brand-subtle text-brand">
            <Icon className="h-5 w-5" />
          </div>
        )}

        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>

          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
};
