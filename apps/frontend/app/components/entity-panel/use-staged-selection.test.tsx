import { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EntityPanelContext } from "./entity-panel-context";
import { mockEntityPanel } from "./mock-entity-panel";
import { useStagedSelection } from "./use-staged-selection";

const FRONTEND = { id: "a-1", name: "Frontend" };
const BACKEND = { id: "a-2", name: "Backend" };

const renderSelection = () => {
  const panel = mockEntityPanel();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <EntityPanelContext.Provider value={panel}>
      {children}
    </EntityPanelContext.Provider>
  );

  return {
    panel,
    ...renderHook(() => useStagedSelection([FRONTEND]), { wrapper }),
  };
};

describe("useStagedSelection", () => {
  it("keeps choices as a draft until they are applied", () => {
    const { result, panel } = renderSelection();
    expect(result.current.selectedIds).toEqual(["a-1"]);

    act(() => result.current.toggle(FRONTEND));
    act(() => result.current.toggle(BACKEND));

    expect(result.current.selectedIds).toEqual(["a-2"]);
    expect(result.current.toRemove).toEqual([FRONTEND]);
    expect(result.current.toAdd).toEqual([BACKEND]);
    expect(result.current.pendingCount).toBe(2);
    expect(panel.setHasUnsavedChanges).toHaveBeenLastCalledWith(true);

    // Choosing them again takes both changes back.
    act(() => result.current.toggle(FRONTEND));
    act(() => result.current.toggle(BACKEND));
    expect(result.current.pendingCount).toBe(0);
    expect(panel.setHasUnsavedChanges).toHaveBeenLastCalledWith(false);
  });

  it("selects one just created, and leaves once every change is applied", async () => {
    const { result, panel } = renderSelection();

    act(() => result.current.select(BACKEND));
    act(() => result.current.select(BACKEND));
    expect(result.current.toAdd).toEqual([BACKEND]);

    await act(() => result.current.apply([Promise.resolve()]));
    expect(panel.back).toHaveBeenCalledOnce();
  });

  it("stays when a change fails, so nothing is lost silently", async () => {
    const { result, panel } = renderSelection();

    act(() => result.current.select(BACKEND));
    await act(() => result.current.apply([Promise.reject(new Error("No"))]));

    expect(panel.back).not.toHaveBeenCalled();
    expect(result.current.toAdd).toEqual([BACKEND]);
  });
});
