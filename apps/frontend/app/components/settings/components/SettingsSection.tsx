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
        "overflow-hidden rounded-2xl",
        "border border-blue-500/20",
        "bg-blue-500/[0.08]",
        "shadow-[0_8px_40px_rgba(0,0,0,0.12)]",
        className,
      )}
    >
      {children}
    </section>
  );
};
