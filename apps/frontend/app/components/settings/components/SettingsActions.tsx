import { cn } from "@/lib/utils/cn";

interface SettingsActionsProps {
  children: React.ReactNode;
  className?: string;
}

export const SettingsActions = ({
  children,
  className,
}: SettingsActionsProps) => {
  return (
    <div
      className={cn(
        "mt-8 flex justify-end border-t border-blue-400/20 px-6 py-4",
        className,
      )}
    >
      {children}
    </div>
  );
};
