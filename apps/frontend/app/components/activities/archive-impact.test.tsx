import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ActivityArchiveImpact } from "@/types";

import { archiveImpactMessage } from "./archive-impact";

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

  it("names the first ten in bold and counts the rest in plain text", () => {
    expect(html({ projects: projects(12) })).toContain(
      `${bold("Project 10")}, and 2 more,`,
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
