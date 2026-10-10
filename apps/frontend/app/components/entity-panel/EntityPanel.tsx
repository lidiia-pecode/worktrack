"use client";

import { KeyboardEvent, ReactNode, useEffect, useId, useRef } from "react";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogSidePanel } from "@/components/ui/dialog";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { EntityRef, formatEntityRef } from "@/lib/utils/entity-ref";

import { ActivityPanel } from "../activities/ActivityPanel";
import { CategoryPanel } from "../categories/CategoryPanel";
import { ProjectPanel } from "../projects/ProjectPanel";
import { CloseButton } from "../shared/buttons/CloseButton";
import { TeamPanel } from "../teams/TeamPanel";
import { UserPanel } from "../users/UserPanel";
import { PanelTitleIdContext, useEntityPanel } from "./entity-panel-context";

// Where the Manage table starts: below it the sidebar leaves no room beside
// the list, so the panel takes the whole screen.
const DESKTOP_MEDIA_QUERY = "(min-width: 64rem)";

const PanelContent = ({ entity }: { entity: EntityRef }) => {
  switch (entity.type) {
    case "user":
      return <UserPanel id={entity.id} />;
    case "team":
      return <TeamPanel id={entity.id} />;
    case "project":
      return <ProjectPanel id={entity.id} />;
    case "activity":
      return <ActivityPanel id={entity.id} />;
    case "category":
      return <CategoryPanel id={entity.id} />;
  }
};

export const EntityPanel = () => {
  const { current, view, previous, back, close } = useEntityPanel();
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY);
  const titleId = useId();
  const asideRef = useRef<HTMLElement>(null);
  const currentKey = current ? formatEntityRef(current) : null;

  // Each entity the panel shows starts at its heading for a keyboard user.
  useEffect(() => {
    if (currentKey) asideRef.current?.focus();
  }, [currentKey]);

  // A view, such as a picker, focuses its own field; leaving one returns to
  // the heading unless focus is still in the panel.
  useEffect(() => {
    const aside = asideRef.current;
    if (aside && !aside.contains(document.activeElement)) aside.focus();
  }, [view]);

  if (!current || !currentKey) return null;

  const body: ReactNode = (
    <PanelTitleIdContext.Provider value={titleId}>
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
        {previous && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={back}
            className="min-w-0 gap-1"
          >
            <ChevronLeft className="size-4" />
            <span className="truncate">{previous.name}</span>
          </Button>
        )}

        <CloseButton
          aria-label="Close panel"
          onClick={close}
          className="ml-auto"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <PanelContent key={currentKey} entity={current} />
      </div>
    </PanelTitleIdContext.Provider>
  );

  if (isDesktop) {
    // Dialogs opened from the panel are portalled out of it; their Escape is theirs.
    const closeOnEscape = (event: KeyboardEvent<HTMLElement>) => {
      if (
        event.key === "Escape" &&
        asideRef.current?.contains(event.target as Node)
      ) {
        close();
      }
    };

    return (
      <aside
        ref={asideRef}
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={closeOnEscape}
        className="fixed inset-y-0 right-0 z-30 flex w-120 max-w-full flex-col border-l border-border bg-card shadow-raised outline-none"
      >
        {body}
      </aside>
    );
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && close()}>
      <DialogSidePanel
        side="right"
        aria-labelledby={titleId}
        className="w-full bg-card"
      >
        {body}
      </DialogSidePanel>
    </Dialog>
  );
};
