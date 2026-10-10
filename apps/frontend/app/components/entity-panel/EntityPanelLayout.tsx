"use client";

import { ReactNode, useContext, useState } from "react";
import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fieldLabelClassName } from "@/components/ui/field";
import { isMissingEntityError } from "@/lib/api";

import { ErrorState } from "../shared/ErrorState";
import { LoadingState } from "../shared/LoadingState";
import type { ManageRowAction } from "../shared/resource/ManageList";
import {
  PanelEntityContext,
  PanelTitleIdContext,
} from "./entity-panel-context";

const VISIBLE_ITEMS = 8;

interface EntityPanelLayoutProps {
  name: string;
  /** A quieter line under the name, such as an email. */
  detail?: ReactNode;
  status: ReactNode;
  /** Opens the entity's form; left out when the viewer cannot edit it. */
  onEdit?: () => void;
  actions?: ManageRowAction[];
  /** While the form is open, the header's actions wait for Save or Cancel. */
  isEditing?: boolean;
  children: ReactNode;
}

export const EntityPanelLayout = ({
  name,
  detail,
  status,
  onEdit,
  actions = [],
  isEditing = false,
  children,
}: EntityPanelLayoutProps) => {
  const titleId = useContext(PanelTitleIdContext);
  const hasHeaderActions = !isEditing && (onEdit || actions.length > 0);

  return (
    <PanelEntityContext.Provider value={{ name }}>
      <header>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-lg font-semibold tracking-tight break-words text-foreground"
            >
              {name}
            </h2>
            {detail && (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {detail}
              </p>
            )}
          </div>

          <div className="shrink-0 pt-1">{status}</div>
        </div>

        {hasHeaderActions && (
          <div className="mt-4 flex flex-wrap gap-2">
            {onEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="gap-1.5"
              >
                <Pencil className="size-4" />
                Edit
              </Button>
            )}

            {actions.map((action) => (
              <Button
                key={action.label}
                type="button"
                variant={action.destructive ? "destructive" : "outline"}
                size="sm"
                onClick={action.onSelect}
                className="gap-1.5"
              >
                <action.icon className="size-4" />
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </header>

      <div className="mt-6 flex flex-col gap-6 border-t border-border pt-6">
        {children}
      </div>
    </PanelEntityContext.Provider>
  );
};

interface PanelStatusProps {
  isActive: boolean;
  inactiveLabel?: string;
}

export const PanelStatus = ({
  isActive,
  inactiveLabel = "Archived",
}: PanelStatusProps) => (
  <Badge variant={isActive ? "success" : "neutral"} dot>
    {isActive ? "Active" : inactiveLabel}
  </Badge>
);

export interface PanelDetail {
  label: string;
  value: ReactNode;
}

/** An entity's own fields, read-only. */
export const PanelDetails = ({ details }: { details: PanelDetail[] }) => (
  <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
    {details.map((detail) => (
      <div key={detail.label} className="min-w-0">
        <dt className={fieldLabelClassName}>{detail.label}</dt>
        <dd className="text-sm break-words text-foreground">{detail.value}</dd>
      </div>
    ))}
  </dl>
);

interface PanelEditFormProps {
  formId: string;
  isSaving: boolean;
  onCancel: () => void;
  children: ReactNode;
}

/** The entity's form in place of its fields, with its own Save and Cancel. */
export const PanelEditForm = ({
  formId,
  isSaving,
  onCancel,
  children,
}: PanelEditFormProps) => (
  <section aria-label="Edit details">
    {children}

    <div className="mt-6 flex justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onCancel}
        disabled={isSaving}
      >
        Cancel
      </Button>

      <Button type="submit" form={formId} size="sm" isLoading={isSaving}>
        Save changes
      </Button>
    </div>
  </section>
);

export interface PanelListRow {
  label: ReactNode;
  /** A quieter line under the label, such as a role or a category. */
  detail?: ReactNode;
  /** At the row's end, such as an Archived badge. */
  badge?: ReactNode;
}

interface PanelListProps<T> {
  title: string;
  items: T[];
  getKey: (item: T) => string;
  renderRow: (item: T) => PanelListRow;
  emptyText: ReactNode;
  /** Under the title, such as how many members the viewer cannot see. */
  note?: ReactNode;
  /** Beside the title, such as a button that adds to the section. */
  action?: ReactNode;
}

/** A relationship section: the first few related entities, and the rest on request. */
export const PanelList = <T,>({
  title,
  items,
  getKey,
  renderRow,
  emptyText,
  note,
  action,
}: PanelListProps<T>) => {
  const [showsAll, setShowsAll] = useState(false);
  const shownItems = showsAll ? items : items.slice(0, VISIBLE_ITEMS);
  const hiddenCount = items.length - shownItems.length;

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">
          {title}
          <span className="ml-1.5 font-normal text-muted-foreground">
            {items.length}
          </span>
        </h3>

        {action}
      </div>

      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}

      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
          {shownItems.map((item) => {
            const row = renderRow(item);

            return (
              <li
                key={getKey(item)}
                className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <div className="truncate">{row.label}</div>
                  {row.detail && (
                    <div className="truncate text-xs text-muted-foreground">
                      {row.detail}
                    </div>
                  )}
                </div>

                {row.badge && <div className="shrink-0">{row.badge}</div>}
              </li>
            );
          })}
        </ul>
      )}

      {hiddenCount > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowsAll(true)}
          className="mt-1"
        >
          Show all {items.length}
        </Button>
      )}
    </section>
  );
};

interface PanelQueryStateProps {
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  /** A manager reads only some of these, and the API answers "not found" for the rest. */
  mayBeHidden?: boolean;
}

/** What the panel shows until its entity has loaded, or when it cannot. */
export const PanelQueryState = ({
  isLoading,
  error,
  onRetry,
  mayBeHidden = false,
}: PanelQueryStateProps) => {
  const titleId = useContext(PanelTitleIdContext);

  if (isLoading) {
    return (
      <>
        <h2 id={titleId} className="sr-only">
          Loading
        </h2>
        <LoadingState size="compact" />
      </>
    );
  }

  if (isMissingEntityError(error)) {
    return (
      <div className="py-10 text-center">
        <h2 id={titleId} className="text-lg font-semibold text-foreground">
          {mayBeHidden ? "Not visible to you" : "Not found"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {mayBeHidden
            ? "It isn't in a team you manage, or it no longer exists."
            : "It may have been removed, or the link is wrong."}
        </p>
      </div>
    );
  }

  return (
    <>
      <h2 id={titleId} className="sr-only">
        Unable to load
      </h2>
      <ErrorState size="compact" onRetry={onRetry} />
    </>
  );
};
