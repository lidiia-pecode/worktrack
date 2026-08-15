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
    <div className="border-b border-blue-400/50 px-6 py-5">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-300">
            <Icon className="h-5 w-5" />
          </div>
        )}

        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>

          <p className="text-sm text-slate-300">{description}</p>
        </div>
      </div>
    </div>
  );
};
