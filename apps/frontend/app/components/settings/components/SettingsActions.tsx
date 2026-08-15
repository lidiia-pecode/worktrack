interface SettingsActionsProps {
  children: React.ReactNode;
}

export const SettingsActions = ({ children }: SettingsActionsProps) => {
  return (
    <div className="mt-8 flex justify-end border-t border-blue-400/20 pt-4">
      {children}
    </div>
  );
};
