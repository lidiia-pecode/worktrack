import { cn } from "@/lib/utils/cn";
import { settingsLabelClassName } from "../styles/settings-styles";

interface SettingsFieldProps {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  description?: string;
  error?: string;
  className?: string;
}

export const SettingsField = ({
  label,
  htmlFor,
  children,
  description,
  error,
  className,
}: SettingsFieldProps) => {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className={settingsLabelClassName}>
        {label}
      </label>

      {children}

      {description && !error && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};
