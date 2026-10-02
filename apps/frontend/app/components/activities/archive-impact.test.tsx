import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ActivityArchiveImpact } from "@/types";

import {
  MAX_NAMED,
  activitiesArchiveImpactMessage,
  archiveImpactMessage,
} from "./archive-impact";

const projects = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: `p${index + 1}`,
    name: `Project ${index + 1}`,
  }));

const html = (impact: ActivityArchiveImpact) =>
  renderToStaticMarkup(<>{archiveImpactMessage(impact)}</>);

const bold = (name: string) =>
  `<strong class="font-semibold text-foreground">${name}</strong>`;

describe("archiveImpactMessage", () => {
  it("names every project the activity is taken off, in bold", () => {
    expect(html({ projects: projects(2) })).toContain(
      `removed from the activity lists of ${bold("Project 1")} and ${bold("Project 2")}`,
    );
  });

  it("names the first few in bold and counts the rest in plain text", () => {
    expect(html({ projects: projects(MAX_NAMED + 2) })).toContain(
      `${bold(`Project ${MAX_NAMED}`)}, and 2 more,`,
    );
  });

  it("says when no active project offers it", () => {
    expect(html({ projects: [] })).toBe("No active project offers it now.");
  });

  it("says the time already logged stays", () => {
    expect(html({ projects: projects(1) })).toContain(
      "Time already logged on it stays in reports",
    );
  });
});

describe("activitiesArchiveImpactMessage", () => {
  const several = (...lists: ActivityArchiveImpact["projects"][]) =>
    renderToStaticMarkup(
      <>
        {activitiesArchiveImpactMessage(lists.map((p) => ({ projects: p })))}
      </>,
    );

  it("names each shared project once, in name order", () => {
    const [first, second] = projects(2);

    expect(several([second, first], [first])).toContain(
      `They will be removed from the activity lists of ${bold("Project 1")} and ${bold("Project 2")}`,
    );
  });

  it("speaks of them, not it", () => {
    expect(several(projects(1), [])).toContain(
      "Time already logged on them stays in reports, and restoring them puts them back",
    );
    expect(several([], [])).toBe("No active project offers them now.");
  });

  it("reads as the single-activity warning for one activity", () => {
    expect(several(projects(2))).toBe(html({ projects: projects(2) }));
  });
});
