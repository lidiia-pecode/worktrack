"use client";

import { Fragment, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { EntityLink, LinkedEntity } from "../entity-panel/EntityLink";

const MAX_LINKED = 6;

/** Entities an action touches, such as "Left without a team". */
export interface ImpactGroup {
  label: string;
  entities: LinkedEntity[];
}

interface ImpactDialogProps {
  isOpen: boolean;
  title: string;
  description: ReactNode;
  affected?: ImpactGroup[];
  choice?: ReactNode;
  blocker?: ReactNode;
  confirmText?: string;
  confirmVariant?: "primary" | "warning" | "destructive" | "success";
  onConfirm: () => void;
  onClose: () => void;
  onNavigate?: () => void;
  loading?: boolean;
  confirmDisabled?: boolean;
}

const AffectedEntities = ({
  group,
  onNavigate,
}: {
  group: ImpactGroup;
  onNavigate: () => void;
}) => {
  const named = group.entities.slice(0, MAX_LINKED);
  const othersCount = group.entities.length - named.length;

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{group.label}</p>
      <p className="mt-0.5 text-sm text-foreground">
        {named.map(({ entity, name }, index) => (
          <Fragment key={entity.id}>
            {index > 0 && ", "}
            <EntityLink entity={entity} onNavigate={onNavigate}>
              {name}
            </EntityLink>
          </Fragment>
        ))}
        {othersCount > 0 && ` and ${othersCount} more`}
      </p>
    </div>
  );
};

/**
 * The confirmation for a risky action in Manage: what happens, who it
 * touches as links, and any choice it needs. Following a link closes it and
 * opens that entity in the panel.
 */
export const ImpactDialog = ({
  isOpen,
  title,
  description,
  affected = [],
  choice,
  blocker,
  confirmText = "Confirm",
  confirmVariant = "primary",
  onConfirm,
  onClose,
  onNavigate = onClose,
  loading = false,
  confirmDisabled = false,
}: ImpactDialogProps) => {
  const shownGroups = affected.filter((group) => group.entities.length > 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="grid gap-4 p-6">
          <DialogHeader className="pr-6">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          {shownGroups.map((group) => (
            <AffectedEntities
              key={group.label}
              group={group}
              onNavigate={onNavigate}
            />
          ))}

          {blocker ? (
            <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning-text">
              {blocker}
            </p>
          ) : (
            choice
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            {blocker ? "Got it" : "Cancel"}
          </Button>

          {!blocker && (
            <Button
              type="button"
              variant={confirmVariant}
              size="sm"
              onClick={onConfirm}
              isLoading={loading}
              disabled={confirmDisabled}
            >
              {confirmText}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
