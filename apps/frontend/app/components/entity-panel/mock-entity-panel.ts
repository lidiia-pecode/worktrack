import { vi } from "vitest";

import type { EntityPanelContextValue } from "./entity-panel-context";

/** A closed panel for tests of what sits inside one, such as a dialog's links. */
export const mockEntityPanel = (
  overrides: Partial<EntityPanelContextValue> = {},
): EntityPanelContextValue => ({
  current: null,
  previous: null,
  open: vi.fn(),
  follow: vi.fn(),
  view: null,
  openView: vi.fn(),
  back: vi.fn(),
  close: vi.fn(),
  hrefFor: () => "#",
  isEditing: false,
  edit: vi.fn(),
  stopEditing: vi.fn(),
  setHasUnsavedChanges: vi.fn(),
  ...overrides,
});
