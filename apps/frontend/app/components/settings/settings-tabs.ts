export const SETTINGS_TABS = ["profile", "security", "company"] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number];

const isSettingsTab = (value: string | null): value is SettingsTab =>
  SETTINGS_TABS.includes(value as SettingsTab);

/**
 * The tab named in `?tab=`, if the person may see it. A Google link result
 * without a tab belongs to Security, where linking started.
 */
export const resolveSettingsTab = (
  tabParam: string | null,
  { isOwner, hasGoogleResult }: { isOwner: boolean; hasGoogleResult: boolean },
): SettingsTab => {
  if (isSettingsTab(tabParam) && (tabParam !== "company" || isOwner)) {
    return tabParam;
  }

  return hasGoogleResult ? "security" : "profile";
};
