import { useRef, useState } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

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

/**
 * The picker outside its form, as in the time form's header. The form reads
 * the values the moment they change, as react-hook-form's `setValue` does.
 */
const PickerInDialog = ({ onSave }: { onSave: (saved: string) => void }) => {
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(30);
  const values = useRef({ hours: 1, minutes: 30 });

  return (
    <div
      role="dialog"
      onKeyDown={(e) => e.key === "Escape" && onSave("closed")}
    >
      <TimePicker
        hours={hours}
        minutes={minutes}
        onHoursChange={(value) => {
          values.current.hours = value;
          setHours(value);
        }}
        onMinutesChange={(value) => {
          values.current.minutes = value;
          setMinutes(value);
        }}
        formId="duration-form"
      />
      <form
        id="duration-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(`${values.current.hours}h ${values.current.minutes}m`);
        }}
      />
      <button type="submit" form="duration-form">
        Save
      </button>
    </div>
  );
};

/**
 * Types into a field the way a person does: the field selects its text on the
 * next frame after focus, and what is typed then replaces it.
 */
const typeInto = async (
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  text: string,
) => {
  await user.click(screen.getByRole("spinbutton", { name }));
  await act(() => new Promise((resolve) => requestAnimationFrame(resolve)));
  await user.keyboard(text);
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

  it("carries typed minutes over 59 into the hours", async () => {
    const user = userEvent.setup();
    render(<Picker initialMinutes={60} />);

    await typeInto(user, "Minutes", "75{Tab}");

    expect(shown()).toBe("02:15");
  });

  it("stops typed hours at 24", async () => {
    const user = userEvent.setup();
    render(<Picker initialMinutes={30} />);

    await typeInto(user, "Hours", "30{Tab}");

    expect(shown()).toBe("24:00");
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

  it("saves the form on Enter, with the value just typed", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<PickerInDialog onSave={onSave} />);

    await typeInto(user, "Minutes", "45{Enter}");

    expect(onSave).toHaveBeenCalledWith("1h 45m");
  });

  it("undoes the typing on Escape without closing the dialog, and closes it with nothing typed", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<PickerInDialog onSave={onSave} />);

    await typeInto(user, "Hours", "7{Escape}");
    expect(shown()).toBe("01:30");
    expect(onSave).not.toHaveBeenCalled();

    await user.click(screen.getByRole("spinbutton", { name: "Hours" }));
    await user.keyboard("{Escape}");
    expect(onSave).toHaveBeenCalledWith("closed");
  });
});
