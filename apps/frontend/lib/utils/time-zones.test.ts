import { describe, expect, it } from "vitest";

import { TIME_ZONE_OPTIONS } from "@/lib/constants/time-zones.generated";

import {
  DEFAULT_TIME_ZONE_OPTIONS,
  searchTimeZones,
  toListedTimeZone,
} from "./time-zones";

const values = (options: { value: string }[]) =>
  options.map((option) => option.value);

describe("time zone list", () => {
  it("stores only zones the runtime knows", () => {
    for (const { value } of TIME_ZONE_OPTIONS) {
      expect(
        () => new Intl.DateTimeFormat("en", { timeZone: value }),
      ).not.toThrow();
    }
  });

  it("leaves out Russia's zones entirely", () => {
    expect(values(TIME_ZONE_OPTIONS)).not.toContain("Europe/Moscow");
    expect(values(TIME_ZONE_OPTIONS)).not.toContain("Europe/Kaliningrad");
    expect(values(TIME_ZONE_OPTIONS)).not.toContain("Asia/Vladivostok");
    expect(toListedTimeZone("W-SU")).toBeNull();
  });

  it("shows Kyiv as Ukraine's only default and finds Crimea by search", () => {
    const ukraine = DEFAULT_TIME_ZONE_OPTIONS.filter((option) =>
      option.label.startsWith("Ukraine"),
    );

    expect(values(ukraine)).toEqual(["Europe/Kyiv"]);
    expect(values(searchTimeZones("simferopol"))).toEqual([
      "Europe/Simferopol",
    ]);
  });

  it("keeps the main clocks of large countries in the default list", () => {
    const us = DEFAULT_TIME_ZONE_OPTIONS.filter((option) =>
      option.label.startsWith("United States"),
    );

    expect(values(us)).toContain("America/Los_Angeles");
    expect(values(us)).not.toContain("America/Detroit");
  });
});

describe("toListedTimeZone", () => {
  it("turns old names into the current zone", () => {
    expect(toListedTimeZone("Europe/Kiev")).toBe("Europe/Kyiv");
    expect(toListedTimeZone("Asia/Calcutta")).toBe("Asia/Kolkata");
    expect(toListedTimeZone("Etc/UTC")).toBe("UTC");
  });

  it("keeps a searchable zone as it is", () => {
    expect(toListedTimeZone("America/Detroit")).toBe("America/Detroit");
  });
});

describe("searchTimeZones", () => {
  it("finds a zone by an old name, a city or a country, ignoring accents", () => {
    expect(values(searchTimeZones("kiev"))).toContain("Europe/Kyiv");
    expect(values(searchTimeZones("detroit"))).toContain("America/Detroit");
    expect(values(searchTimeZones("sao paulo"))).toContain("America/Sao_Paulo");
    expect(values(searchTimeZones("cote"))).toContain("Africa/Abidjan");
  });

  it("lists a country's default zones before its other zones", () => {
    const [first] = searchTimeZones("united states");

    expect(first.isDefault).toBe(true);
  });
});
