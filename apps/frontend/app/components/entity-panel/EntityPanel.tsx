"use client";

import { useEffect, useId, useRef } from "react";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EntityRef, formatEntityRef } from "@/lib/utils/entity-ref";

import { ActivityPanel } from "../activities/ActivityPanel";
import { CategoryPanel } from "../categories/CategoryPanel";
import { ProjectPanel } from "../projects/ProjectPanel";
import { CloseButton } from "../shared/buttons/CloseButton";
import { SidePanel } from "../shared/SidePanel";
import { TeamPanel } from "../teams/TeamPanel";
import { UserPanel } from "../users/UserPanel";
import { PanelTitleIdContext, useEntityPanel } from "./entity-panel-context";

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
  const titleId = useId();
  const asideRef = useRef<HTMLElement>(null);
  const currentKey = current ? formatEntityRef(current) : "";

  // A view, such as a picker, focuses its own field; leaving one returns to
  // the heading unless focus is still in the panel.
  useEffect(() => {
    const aside = asideRef.current;
    if (aside && !aside.contains(document.activeElement)) aside.focus();
  }, [view]);

  if (!current) return null;

  return (
    <SidePanel
      ref={asideRef}
      titleId={titleId}
      focusKey={currentKey}
      onClose={close}
    >
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
    </SidePanel>
  );
};
