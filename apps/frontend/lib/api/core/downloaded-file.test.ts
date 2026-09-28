import { describe, expect, it } from "vitest";

import { fileNameFromDisposition } from "./downloaded-file";

describe("fileNameFromDisposition", () => {
  it("reads the file name the server gave", () => {
    expect(
      fileNameFromDisposition(
        'attachment; filename="worktrack-hours-2026-09-01-2026-09-30.xlsx"',
      ),
    ).toBe("worktrack-hours-2026-09-01-2026-09-30.xlsx");
  });

  it("falls back when there is no file name", () => {
    expect(fileNameFromDisposition(null)).toBe("download");
    expect(fileNameFromDisposition("attachment")).toBe("download");
  });
});
