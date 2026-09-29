import {
  TIME_ZONE_ALIASES,
  TIME_ZONE_OPTIONS,
  type TimeZoneOption,
} from "@/lib/constants/time-zones.generated";

export type { TimeZoneOption };

const OPTIONS_BY_VALUE = new Map(
  TIME_ZONE_OPTIONS.map((option) => [option.value, option]),
);

export const DEFAULT_TIME_ZONE_OPTIONS = TIME_ZONE_OPTIONS.filter(
  (option) => option.isDefault,
);

export const toListedTimeZone = (zone?: string | null): string | null => {
  if (!zone) return null;
  if (OPTIONS_BY_VALUE.has(zone)) return zone;

  return TIME_ZONE_ALIASES[zone] ?? null;
};

export const findTimeZoneOption = (
  zone?: string | null,
): TimeZoneOption | null => {
  const listed = toListedTimeZone(zone);
  return listed ? (OPTIONS_BY_VALUE.get(listed) ?? null) : null;
};

const toSearchText = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Every zone matching all the words typed, the default ones first. */
export const searchTimeZones = (query: string): TimeZoneOption[] => {
  const words = toSearchText(query).split(/\s+/).filter(Boolean);
  const matches = TIME_ZONE_OPTIONS.filter((option) =>
    words.every((word) => option.searchText.includes(word)),
  );

  return [
    ...matches.filter((option) => option.isDefault),
    ...matches.filter((option) => !option.isDefault),
  ];
};

/** The browser's zone as a listed zone; browsers still report old names. */
export const browserTimeZone = (): string | null =>
  toListedTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
