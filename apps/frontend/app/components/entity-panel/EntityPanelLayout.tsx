"use client";

import {
  ComponentProps,
  forwardRef,
  Fragment,
  ReactNode,
  useContext,
} from "react";
import { Pencil, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isMissingEntityError } from "@/lib/api";
import { cn } from "@/lib/utils/cn";

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
  /** A line under the name, such as a person's position. */
  subtitle?: ReactNode;
  status: ReactNode;
  /** Beside the status, such as a role, a client or the team's manager. */
  meta?: ReactNode;
  /** Opens the entity's form; left out when the viewer cannot edit it. */
  onEdit?: () => void;
  /** Its lifecycle, such as Archive or Restore, beside Edit. */
  actions?: ManageRowAction[];
  /** The entity's own fields, for those with more than its header can carry. */
  details?: PanelDetail[];
  /** The open form: it takes the panel until Save or Cancel. */
  editForm?: ReactNode;
  /** Whether the form edits the name too, in the heading's place. */
  editsName?: boolean;
  /** The related entities, each section managed where it stands. */
  children?: ReactNode;
}

const TOOLBAR_BUTTON = "rounded-none first:rounded-l-md last:rounded-r-md";

/**
 * The entity's identity in the header, with its actions in a quiet toolbar
 * above the name; its own fields under Details where the header cannot carry
 * them, which Edit changes; and its relationships below, each changed in its
 * own section. While the form is open it is the whole panel, so what Edit
 * covers is never in doubt.
 */
export const EntityPanelLayout = ({
  type,
  name,
  subtitle,
  status,
  meta,
  onEdit,
  actions = [],
  details = [],
  editForm,
  editsName = false,
  children,
}: EntityPanelLayoutProps) => {
  const titleId = useContext(PanelTitleIdContext);
  const isEditing = Boolean(editForm);
  // The form's own name field stands where the heading was.
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

              <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
                {status}
                {meta}
              </div>
            </>
          )}
        </div>
      </header>

      <div
        className={cn("flex flex-col gap-7", hidesHeading ? "mt-1" : "mt-7")}
      >
        {isEditing ? (
          editForm
        ) : (
          <>
            {details.length > 0 && <PanelDetails details={details} />}
            {children}
          </>
        )}
      </div>
    </PanelEntityContext.Provider>
  );
};

interface PanelTitleInputProps extends ComponentProps<"input"> {
  error?: string;
}

/**
 * A form's name field in the panel: it reads as the heading it replaces, with
 * a line under it that shows where typing goes.
 */
export const PanelTitleInput = forwardRef<
  HTMLInputElement,
  PanelTitleInputProps
>(({ id, error, className, ...props }, ref) => (
  <div>
    <input
      ref={ref}
      id={id}
      aria-invalid={Boolean(error)}
      aria-describedby={error && id ? `${id}-error` : undefined}
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

export interface PanelDetail {
  label: string;
  value: ReactNode;
  /** A long value, such as a description, under its label rather than beside it. */
  wide?: boolean;
}

/** A section's heading, with how many it holds and what adds to it. */
export const PanelSectionHeading = ({
  title,
  count,
  action,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
}) => (
  <div className="flex min-h-8 items-center justify-between gap-3">
    <h3 className="text-sm font-semibold text-foreground">
      {title}
      {count !== undefined && (
        <span className="ml-1.5 font-normal text-muted-foreground">
          {count}
        </span>
      )}
    </h3>

    {action}
  </div>
);

/** An entity's own fields, a label beside each value. */
export const PanelDetails = ({ details }: { details: PanelDetail[] }) => (
  <section>
    <PanelSectionHeading title="Details" />

    <dl className="mt-2 grid grid-cols-3 gap-x-4 gap-y-3">
      {details.map((detail) => (
        <Fragment key={detail.label}>
          <dt
            className={cn(
              "text-sm text-muted-foreground",
              detail.wide && "col-span-3",
            )}
          >
            {detail.label}
          </dt>
          <dd
            className={cn(
              "min-w-0 text-sm break-words text-foreground",
              detail.wide ? "col-span-3 -mt-2" : "col-span-2",
            )}
          >
            {detail.value}
          </dd>
        </Fragment>
      ))}
    </dl>
  </section>
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
  /** How many choices wait for Done. */
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
            {pendingCount} {pendingCount === 1 ? "change" : "changes"} to apply
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
