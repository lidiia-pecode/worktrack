import { cn } from "@/lib/utils/cn";

interface SettingsSectionProps {
  children: React.ReactNode;
  className?: string;
}

export const SettingsSection = ({
  children,
  className,
}: SettingsSectionProps) => {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      {children}
    </section>
  );
};
