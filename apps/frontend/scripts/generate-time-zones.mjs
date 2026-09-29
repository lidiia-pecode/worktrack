// Builds lib/constants/time-zones.generated.ts from IANA tzdata:
//
//   npm run generate:time-zones
//
// It reads zone.tab and tzdata.zi from /usr/share/zoneinfo. Every zone in
// zone.tab can be searched; the default list shows one main zone per country,
// and the main clocks of the large countries below. Rerun it when IANA adds or
// renames a zone.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Left out of the list and the search entirely. */
const EXCLUDED_COUNTRIES = ["RU"];

/** Searchable, but not worth a place in the default list. */
const SEARCH_ONLY_COUNTRIES = ["AQ", "UM"];

/** Countries with several important clocks, and the label for each. */
const MAIN_ZONES_BY_REGION = {
  US: [
    ["America/New_York", "Eastern"],
    ["America/Chicago", "Central"],
    ["America/Denver", "Mountain"],
    ["America/Phoenix", "Arizona"],
    ["America/Los_Angeles", "Pacific"],
    ["America/Anchorage", "Alaska"],
    ["Pacific/Honolulu", "Hawaii"],
  ],
  CA: [
    ["America/St_Johns", "Newfoundland"],
    ["America/Halifax", "Atlantic"],
    ["America/Toronto", "Eastern"],
    ["America/Winnipeg", "Central"],
    ["America/Regina", "Saskatchewan"],
    ["America/Edmonton", "Mountain"],
    ["America/Vancouver", "Pacific"],
  ],
  AU: [
    ["Australia/Sydney", "Eastern"],
    ["Australia/Brisbane", "Queensland"],
    ["Australia/Adelaide", "Central"],
    ["Australia/Darwin", "Northern Territory"],
    ["Australia/Perth", "Western"],
  ],
  MX: [
    ["America/Mexico_City", "Central"],
    ["America/Cancun", "Quintana Roo"],
    ["America/Mazatlan", "Pacific"],
    ["America/Tijuana", "Baja California"],
  ],
  ID: [
    ["Asia/Jakarta", "Western"],
    ["Asia/Makassar", "Central"],
    ["Asia/Jayapura", "Eastern"],
  ],
  BR: [
    ["America/Sao_Paulo", "Brasília"],
    ["America/Manaus", "Amazon"],
  ],
  CD: [
    ["Africa/Kinshasa", "West"],
    ["Africa/Lubumbashi", "East"],
  ],
};

/** The default zone for other countries that IANA splits into several. */
const MAIN_ZONE = {
  AR: "America/Argentina/Buenos_Aires",
  CL: "America/Santiago",
  CN: "Asia/Shanghai",
  CY: "Asia/Nicosia",
  DE: "Europe/Berlin",
  EC: "America/Guayaquil",
  ES: "Europe/Madrid",
  FM: "Pacific/Pohnpei",
  GL: "America/Nuuk",
  KI: "Pacific/Tarawa",
  KZ: "Asia/Almaty",
  MH: "Pacific/Majuro",
  MN: "Asia/Ulaanbaatar",
  MY: "Asia/Kuala_Lumpur",
  NZ: "Pacific/Auckland",
  PF: "Pacific/Tahiti",
  PG: "Pacific/Port_Moresby",
  PS: "Asia/Hebron",
  PT: "Europe/Lisbon",
  UA: "Europe/Kyiv",
  UZ: "Asia/Tashkent",
};

/** Shorter names where Intl's region name reads awkwardly in a label. */
const COUNTRY_NAME = {
  CD: "DR Congo",
  CG: "Congo",
  HK: "Hong Kong",
  MM: "Myanmar",
  MO: "Macao",
};

const tzdataDir = process.argv[2];
if (!tzdataDir) {
  throw new Error("Pass the folder that holds zone.tab and tzdata.zi");
}

const zoneRows = readFileSync(join(tzdataDir, "zone.tab"), "utf8")
  .split("\n")
  .filter((line) => line && !line.startsWith("#"))
  .map((line) => {
    const [country, , zone] = line.split("\t");
    return { country, zone };
  });

const links = readFileSync(join(tzdataDir, "tzdata.zi"), "utf8")
  .split("\n")
  .filter((line) => line.startsWith("L "))
  .map((line) => {
    const [, target, name] = line.split(" ");
    return { target, name };
  });

const regionNames = new Intl.DisplayNames("en", { type: "region" });
const countryName = (country) =>
  COUNTRY_NAME[country] ?? regionNames.of(country);
const cityOf = (zone) => zone.split("/").pop().replaceAll("_", " ");

/** Lower case without accents, so "sao" finds "São Paulo". */
const searchable = (text) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const isKnownToThisNode = (zone) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
};

const defaultLabels = new Map();

for (const [country, rows] of Map.groupBy(zoneRows, (row) => row.country)) {
  if (
    EXCLUDED_COUNTRIES.includes(country) ||
    SEARCH_ONLY_COUNTRIES.includes(country)
  ) {
    continue;
  }

  const name = countryName(country);
  const defaults = MAIN_ZONES_BY_REGION[country]
    ? MAIN_ZONES_BY_REGION[country].map(([zone, region]) => [
        zone,
        `${name} — ${cityOf(zone)} (${region})`,
      ])
    : [[rows.length === 1 ? rows[0].zone : MAIN_ZONE[country], null]];

  for (const [zone, label] of defaults) {
    if (!zone) throw new Error(`Choose the main zone for ${country} (${name})`);
    if (!rows.some((row) => row.zone === zone)) {
      throw new Error(`${zone} is not a ${country} zone in zone.tab`);
    }
    defaultLabels.set(zone, label);
  }
}

const options = zoneRows
  .filter((row) => !EXCLUDED_COUNTRIES.includes(row.country))
  .map(({ country, zone }) => {
    if (!isKnownToThisNode(zone)) {
      throw new Error(`${zone} is unknown to this Node; update Node first`);
    }

    const name = countryName(country);
    const label =
      defaultLabels.get(zone) ??
      (cityOf(zone) === name ? name : `${name} - ${cityOf(zone)}`);

    return { value: zone, label, isDefault: defaultLabels.has(zone) };
  });

const optionValues = new Set(options.map((option) => option.value));

// Old names such as Europe/Kiev, which browsers still report.
const aliases = Object.fromEntries(
  links
    .filter(
      ({ target, name }) => optionValues.has(target) && !optionValues.has(name),
    )
    .map(({ target, name }) => [name, target])
    .sort(([a], [b]) => a.localeCompare(b)),
);

const aliasesByZone = Map.groupBy(Object.entries(aliases), ([, zone]) => zone);

const timeZones = [
  { value: "UTC", label: "UTC", isDefault: true },
  ...options.sort((a, b) => a.label.localeCompare(b.label)),
].map((option) => ({
  ...option,
  searchText: searchable(
    [
      option.label,
      option.value,
      ...(aliasesByZone.get(option.value) ?? []).map(([name]) => name),
    ].join(" "),
  ),
}));

const output = `// Generated by scripts/generate-time-zones.mjs from IANA tzdata. Do not edit.

export interface TimeZoneOption {
  value: string;
  label: string;
  /** Shown before anything is typed; the rest appear only in search. */
  isDefault: boolean;
  searchText: string;
}

export const TIME_ZONE_OPTIONS: TimeZoneOption[] = ${JSON.stringify(timeZones, null, 2)};

/** Old IANA names mapped to the zone that replaced them. */
export const TIME_ZONE_ALIASES: Record<string, string> = ${JSON.stringify(aliases, null, 2)};
`;

writeFileSync(
  new URL("../lib/constants/time-zones.generated.ts", import.meta.url),
  output,
);

console.log(
  `${timeZones.length} zones, ${timeZones.filter((zone) => zone.isDefault).length} in the default list, ${Object.keys(aliases).length} aliases`,
);
