import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { TimePicker } from "./TimePicker";

const Picker = ({ initialMinutes }: { initialMinutes: number }) => {
  const [hours, setHours] = useState(Math.floor(initialMinutes / 60));
  const [minutes, setMinutes] = useState(initialMinutes % 60);

  return (
    <TimePicker
      hours={hours}
      minutes={minutes}
      onHoursChange={setHours}
      onMinutesChange={setMinutes}
    />
  );
};

const shown = () =>
  ["Hours", "Minutes"]
    .map(
      (name) =>
        screen.getByRole<HTMLInputElement>("spinbutton", { name }).value,
    )
    .join(":");

describe("TimePicker", () => {
  it("carries minutes into the hours in both directions", async () => {
    const user = userEvent.setup();
    render(<Picker initialMinutes={55} />);

    await user.click(screen.getByRole("button", { name: "Increase: Minutes" }));
    expect(shown()).toBe("01:00");

    await user.click(screen.getByRole("button", { name: "Decrease: Minutes" }));
    expect(shown()).toBe("00:55");
  });

  it("shows and keeps a value stepped by arrow key while the field has focus", async () => {
    const user = userEvent.setup();
    render(<Picker initialMinutes={90} />);

    await user.click(screen.getByRole("spinbutton", { name: "Hours" }));
    await user.keyboard("{ArrowUp}");
    expect(shown()).toBe("02:30");

    await user.tab();
    expect(shown()).toBe("02:30");
  });

  it("stops at 24 hours", async () => {
    const user = userEvent.setup();
    render(<Picker initialMinutes={23 * 60 + 30} />);

    await user.click(screen.getByRole("button", { name: "Increase: Hours" }));
    expect(shown()).toBe("24:00");
    expect(
      screen.getByRole("button", { name: "Increase: Minutes" }),
    ).toBeDisabled();
  });
});
