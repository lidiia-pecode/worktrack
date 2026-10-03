import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Field } from "./field";
import Input from "./input";

describe("Field", () => {
  it("names the control by its label and describes it by its hint", () => {
    render(<Input label="Project name" description="Use a clear name." />);

    const input = screen.getByLabelText("Project name");

    expect(input).toHaveAccessibleDescription("Use a clear name.");
    expect(input).not.toBeInvalid();
  });

  it("replaces the hint with the error and marks the control invalid", () => {
    render(
      <Input
        label="Project name"
        description="Use a clear name."
        error="Name is required"
      />,
    );

    const input = screen.getByLabelText("Project name");

    expect(input).toHaveAccessibleDescription("Name is required");
    expect(input).toBeInvalid();
    expect(screen.queryByText("Use a clear name.")).not.toBeInTheDocument();
  });

  it("names a group of controls by its legend", () => {
    render(
      <Field id="duration" label="Duration" group error="Enter a duration">
        <input aria-label="Hours" />
        <input aria-label="Minutes" />
      </Field>,
    );

    const group = screen.getByRole("group", { name: "Duration" });

    expect(group).toHaveAccessibleDescription("Enter a duration");
  });
});
