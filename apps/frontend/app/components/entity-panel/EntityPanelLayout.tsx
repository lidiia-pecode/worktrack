"use client";

import { ComponentProps, forwardRef, ReactNode, useContext } from "react";
import { Pencil, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isMissingEntityError } from "@/lib/api";
import { cn } from "@/lib/utils/cn";
import { countLabel } from "@/lib/utils/text";

import { ErrorState } from "../shared/ErrorState";
import { LoadingState } from "../shared/LoadingState";
import type { ManageRowAction } from "../shared/resource/ManageList";
import {
  PanelEntityContext,
  PanelTitleIdContext,
} from "./entity-panel-context";

interface EntityPanelLayoutProps {
  /** What the entity is, such as "Project", above its name. */
  type: string;
  name: string;
  subtitle?: ReactNode;
  status: ReactNode;
  /** Opens the entity's form; left out when the viewer cannot edit it. */
  onEdit?: () => void;
  /** Its lifecycle, such as Archive or Restore, beside Edit. */
  actions?: ManageRowAction[];
  /** The entity's own facts under its name, such as a client or a category. */
  details?: PanelDetail[];
  /** The open form: it takes the panel until Save or Cancel. */
  editForm?: ReactNode;
  /** Whether the form edits the name too, in the heading's place. */
  editsName?: boolean;
  children?: ReactNode;
}

const TOOLBAR_BUTTON = "rounded-none first:rounded-l-md last:rounded-r-md";

/** The panel's header, facts and relationship sections; an open form replaces everything under the heading. */
export const EntityPanelLayout = ({
  type,
  name,
  subtitle,
  status,
  onEdit,
  actions = [],
  details = [],
  editForm,
  editsName = false,
  children,
}: EntityPanelLayoutProps) => {
  const titleId = useContext(PanelTitleIdContext);
  const isEditing = Boolean(editForm);
  const hidesHeading = isEditing && editsName;
  const hasToolbar = !isEditing && (onEdit || actions.length > 0);

  return (
    <PanelEntityContext.Provider value={{ name }}>
      <header>
        <div className="flex min-h-7 items-center justify-between gap-3">
          <p className="text-2xs font-medium tracking-wider text-muted-foreground uppercase">
            {isEditing ? `Editing ${type.toLowerCase()}` : type}
          </p>

          {hasToolbar && (
            <div
              role="toolbar"
              aria-label={`Actions for ${name}`}
              className="flex items-center divide-x divide-border rounded-md border border-border bg-card shadow-xs"
            >
              {onEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={onEdit}
                  className={cn(TOOLBAR_BUTTON, "text-foreground")}
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
              )}

              {actions.map((action) => (
                <Button
                  key={action.label}
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={action.onSelect}
                  className={cn(
                    TOOLBAR_BUTTON,
                    action.destructive
                      ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive-text"
                      : "text-brand",
                  )}
                >
                  <action.icon className="size-3.5" />
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className={cn(hidesHeading && "sr-only")}>
          <h2
            id={titleId}
            className="mt-1 text-xl font-semibold tracking-tight break-words text-foreground"
          >
            {name}
          </h2>

          {!isEditing && (
            <>
              {subtitle && (
                <p className="mt-0.5 text-sm text-foreground/80">{subtitle}</p>
              )}

              <div className="mt-2.5 flex">{status}</div>

              {details.length > 0 && <PanelDetails details={details} />}
            </>
          )}
        </div>
      </header>

      <div
        className={cn("flex flex-col gap-7", hidesHeading ? "mt-1" : "mt-7")}
      >
        {isEditing ? editForm : children}
      </div>
    </PanelEntityContext.Provider>
  );
};

interface PanelTitleInputProps extends ComponentProps<"input"> {
  id: string;
  error?: string;
}

/** A name field set like the heading it replaces. */
export const PanelTitleInput = forwardRef<
  HTMLInputElement,
  PanelTitleInputProps
>(({ id, error, className, ...props }, ref) => (
  <div>
    <input
      ref={ref}
      id={id}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      className={cn(
        "w-full border-0 border-b-2 border-border/60 bg-transparent px-0 pt-0 pb-1 text-xl font-semibold tracking-tight text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-brand",
        error && "border-destructive focus:border-destructive",
        className,
      )}
      {...props}
    />

    {error && (
      <p id={`${id}-error`} className="mt-1.5 text-xs text-destructive-text">
        {error}
      </p>
    )}
  </div>
));
PanelTitleInput.displayName = "PanelTitleInput";

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

interface PanelDetail {
  label: string;
  value: ReactNode;
  /** A long value, such as a description or an email, across both columns. */
  wide?: boolean;
}

/** An entity's own facts, each label above its value, two to a row. */
const PanelDetails = ({ details }: { details: PanelDetail[] }) => (
  <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
    {details.map((detail) => (
      <div
        key={detail.label}
        className={cn("min-w-0", detail.wide && "col-span-2")}
      >
        <dt className="text-xs text-muted-foreground">{detail.label}</dt>
        <dd className="mt-1 text-sm break-words text-foreground">
          {detail.value}
        </dd>
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

interface PanelViewProps {
  title: string;
  description: ReactNode;
  /** Making a new one instead, such as "New activity", which joins the choices. */
  create?: { label: string; onClick: () => void };
  pendingCount: number;
  isApplying: boolean;
  onDone: () => void;
  /** Done's label when it leads somewhere else, such as back to setup. */
  doneLabel?: string;
  onCancel: () => void;
  children: ReactNode;
}

/** A picker in the panel: choices wait as a draft until Done applies them. */
export const PanelView = ({
  title,
  description,
  create,
  pendingCount,
  isApplying,
  onDone,
  doneLabel = "Done",
  onCancel,
  children,
}: PanelViewProps) => {
  const titleId = useContext(PanelTitleIdContext);

  return (
    <>
      <h2
        id={titleId}
        className="text-lg font-semibold tracking-tight break-words text-foreground"
      >
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>

      {create && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={create.onClick}
          disabled={isApplying}
          className="mt-4 gap-1.5"
        >
          <Plus className="size-4" />
          {create.label}
        </Button>
      )}

      <div className="mt-5">{children}</div>

      <div className="mt-6 flex items-center justify-end gap-2">
        {pendingCount > 0 && (
          <p className="mr-auto text-sm text-muted-foreground" role="status">
            {countLabel(pendingCount, "change", "changes")} to apply
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isApplying}
        >
          Cancel
        </Button>

        <Button type="button" size="sm" onClick={onDone} isLoading={isApplying}>
          {doneLabel}
        </Button>
      </div>
    </>
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
