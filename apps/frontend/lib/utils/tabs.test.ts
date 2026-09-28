import { describe, expect, it } from "vitest";

import { getNextTabIndex } from "./tabs";

describe("getNextTabIndex", () => {
  it("moves to the next and previous tab", () => {
    expect(getNextTabIndex("ArrowRight", 0, 3)).toBe(1);
    expect(getNextTabIndex("ArrowLeft", 2, 3)).toBe(1);
  });

  it("wraps around at both ends", () => {
    expect(getNextTabIndex("ArrowRight", 2, 3)).toBe(0);
    expect(getNextTabIndex("ArrowLeft", 0, 3)).toBe(2);
  });

  it("jumps to the first and last tab", () => {
    expect(getNextTabIndex("Home", 2, 3)).toBe(0);
    expect(getNextTabIndex("End", 0, 3)).toBe(2);
  });

  it("ignores other keys", () => {
    expect(getNextTabIndex("ArrowDown", 1, 3)).toBeNull();
    expect(getNextTabIndex("Enter", 1, 3)).toBeNull();
  });
});
