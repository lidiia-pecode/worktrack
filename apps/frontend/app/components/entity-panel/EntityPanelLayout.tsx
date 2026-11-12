"use client";

import { ComponentProps, forwardRef, ReactNode, useContext } from "react";
import { createPortal } from "react-dom";
import { Archive, LucideIcon, Pencil, Plus, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { isMissingEntityError } from "@/lib/api";
import { cn } from "@/lib/utils/cn";
import { countLabel } from "@/lib/utils/text";

import { ErrorState } from "../shared/ErrorState";
import { LoadingState } from "../shared/LoadingState";
import type { ManageRowAction } from "../shared/resource/ManageList";
import { ActionsMenu } from "./PanelList";
import {
  PanelActionsSlotContext,
  PanelEntityContext,
  PanelFooterSlotContext,
  PanelFormContext,
  PanelTitleIdContext,
} from "./entity-panel-context";

interface EntityPanelLayoutProps {
  name: string;
  /** Before the name, a person's avatar or the entity's icon, which tells what it is. */
  leading?: ReactNode;
  subtitle?: ReactNode;
  /** Only what the tab doesn't already say, such as Archived or Deactivated. */
  status?: ReactNode;
  /** Opens the entity's form; left out when the viewer cannot edit it. */
  onEdit?: () => void;
  /** The edit button's words, "Rename" where only the name changes. */
  editLabel?: string;
  /** Its lifecycle, such as Archive or Restore, beside Edit. */
  actions?: ManageRowAction[];
  /** A paragraph about the entity under its heading, such as a project's description. */
  description?: ReactNode;
  /** The entity's own facts under its name, such as a role or a category. */
  details?: PanelDetail[];
  /** The open form: it takes the facts' place until Save or Cancel. */
  editForm?: ReactNode;
  /** Whether the form edits the name too, in the heading's place. */
  editsName?: boolean;
  children?: ReactNode;
}

/**
 * The panel's header, facts and relationship sections. An open form edits the
 * entity in place of its facts; the sections stay in view, dimmed, until it
 * closes.
 */
export const EntityPanelLayout = ({
  name,
  leading,
  subtitle,
  status,
  onEdit,
  editLabel = "Edit",
  actions = [],
  description,
  details = [],
  editForm,
  editsName = false,
  children,
}: EntityPanelLayoutProps) => {
  const titleId = useContext(PanelTitleIdContext);
  const isEditing = Boolean(editForm);
  const hidesHeading = isEditing && editsName;
  const showsStatus = !isEditing && Boolean(status);

  // One action in sight: Edit, or else a way back such as Restore. The rest
  // follow as one quiet button, or behind "⋯" when there are two or more.
  const editAction: ManageRowAction | undefined = onEdit && {
    label: editLabel,
    icon: Pencil,
    onSelect: onEdit,
  };
  const shownAction = editAction ?? actions.find((action) => !action.warning);
  const otherActions = actions.filter((action) => action !== shownAction);
  const hasActions = !isEditing && (shownAction || otherActions.length > 0);
  const actionsSlot = useContext(PanelActionsSlotContext);

  // In the panel's top bar beside its close button, and drawn like it.
  const toolbar = (
    <div className="flex items-center gap-1">
      {shownAction && <TopBarAction action={shownAction} leads />}

      {otherActions.length === 1 && <TopBarAction action={otherActions[0]} />}

      {otherActions.length > 1 && (
        <ActionsMenu
          label={`More actions for ${name}`}
          actions={otherActions}
        />
      )}

      <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
    </div>
  );

  return (
    <PanelEntityContext.Provider value={{ name }}>
      {hasActions &&
        (actionsSlot ? createPortal(toolbar, actionsSlot) : toolbar)}

      <header className={cn(hidesHeading && "sr-only")}>
        <div className="flex items-start gap-3">
          {leading && (
            <span aria-hidden="true" className="shrink-0">
              {leading}
            </span>
          )}

          {/* Beside the leading mark when short, growing down from it when long. */}
          <div className="flex min-h-9 min-w-0 flex-1 flex-col justify-center">
            <h2
              id={titleId}
              className="text-lg leading-snug font-semibold tracking-tight break-words text-foreground"
            >
              {name}
            </h2>

            {!isEditing && subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>

        {showsStatus && <div className="mt-6 flex">{status}</div>}
      </header>

      <div
        className={cn(
          "flex flex-col gap-4",
          // Room under the heading; a status line is part of it.
          hidesHeading ? "mt-1" : showsStatus ? "mt-4" : "mt-6",
        )}
      >
        {isEditing ? (
          <PanelFormContext.Provider value={{ leading }}>
            {editForm}
          </PanelFormContext.Provider>
        ) : (
          <>
            {description}
            {details.length > 0 && <PanelDetails details={details} />}
          </>
        )}

        {children && (
          // Visible while the form is open, but out of reach, so a click
          // elsewhere can't leave the form's changes behind.
          <div
            inert={isEditing}
            className={cn(
              "flex flex-col gap-4 transition-opacity",
              isEditing && "opacity-50",
            )}
          >
            {children}
          </div>
        )}
      </div>
    </PanelEntityContext.Provider>
  );
};

/**
 * An action in the panel's top bar: borderless like the close button, the
 * lead one darker, a warning one amber on hover. On a phone only its icon
 * shows, so the bar keeps room for "back".
 */
const TopBarAction = ({
  action,
  leads = false,
}: {
  action: ManageRowAction;
  leads?: boolean;
}) => (
  <Button
    type="button"
    variant="ghost"
    size="sm"
    onClick={action.onSelect}
    title={action.label}
    className={cn(
      "gap-1.5 max-sm:aspect-square max-sm:px-0",
      leads && "text-foreground",
      action.warning && "hover:bg-warning-subtle hover:text-warning-text",
    )}
  >
    <action.icon aria-hidden="true" className="size-4" />
    <span className="max-sm:sr-only">{action.label}</span>
  </Button>
);

/**
 * Something about the entity that someone has to act on, such as a team with
 * no active manager: one amber line under the heading, with the fix beside it.
 */
export const PanelNotice = ({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  /** The fix, such as "Choose manager"; left out for whoever can't make it. */
  action?: { label: string; onClick: () => void };
}) => (
  <div className="flex w-full items-center gap-3 rounded-lg border border-warning-border bg-warning-subtle px-3 py-2.5">
    <TriangleAlert
      aria-hidden="true"
      className="mt-0.5 size-4 shrink-0 self-start text-warning-text"
    />
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-warning-text">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
    {action && (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={action.onClick}
        className="shrink-0 bg-card"
      >
        {action.label}
      </Button>
    )}
  </div>
);

/**
 * A panel's leading mark where there is no avatar: the entity's icon, as the
 * sidebar shows it, or a project's colour. It says what the panel shows.
 */
export const PanelIcon = ({ children }: { children: ReactNode }) => (
  <span className="flex size-9 items-center justify-center rounded-lg bg-brand-muted text-brand">
    {children}
  </span>
);

interface PanelTitleInputProps extends ComponentProps<"input"> {
  id: string;
  error?: string;
}

/**
 * A name field set like the heading it replaces; in a panel, beside the
 * panel's leading mark.
 */
export const PanelTitleInput = forwardRef<
  HTMLInputElement,
  PanelTitleInputProps
>(({ id, error, className, ...props }, ref) => {
  const panelForm = useContext(PanelFormContext);
  const leading = panelForm?.leading;

  return (
    <div className="flex items-start gap-3">
      {leading && (
        <span aria-hidden="true" className="shrink-0">
          {leading}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <input
          ref={ref}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            "w-full border-0 border-b-2 border-border/60 bg-transparent px-0 pt-0 pb-1 font-semibold tracking-tight text-foreground outline-none transition-colors placeholder:font-normal placeholder:text-input-placeholder focus:border-brand",
            panelForm ? "h-9 py-0 text-lg" : "text-xl",
            error && "border-destructive focus:border-destructive",
            className,
          )}
          {...props}
        />

        {error && (
          <p
            id={`${id}-error`}
            className="mt-1.5 text-xs text-destructive-text"
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
});
PanelTitleInput.displayName = "PanelTitleInput";

/**
 * A form's fields after its name: in a panel, a card where the facts stood;
 * in a dialog, as they are.
 */
export const PanelFormFields = ({ children }: { children: ReactNode }) =>
  useContext(PanelFormContext) ? (
    <div className="space-y-5 rounded-xl border border-border p-4">
      {children}
    </div>
  ) : (
    <>{children}</>
  );

/**
 * An archived or deactivated entity's status, one quiet line across the panel
 * so it is seen before the details; an active one shows none.
 */
export const PanelStatus = ({
  label = "Archived.",
  icon: Icon = Archive,
}: {
  label?: ReactNode;
  icon?: LucideIcon;
}) => (
  <p className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
    <Icon aria-hidden="true" className="size-4 shrink-0" />
    <span>{label}</span>
  </p>
);

interface PanelDetail {
  label: string;
  value: ReactNode;
}

/**
 * An entity's own facts: a card of rows, each label beside its value, or
 * above it on a phone. It needs no title; it is the entity under the heading.
 */
const PanelDetails = ({ details }: { details: PanelDetail[] }) => (
  <dl className="divide-y divide-border/55 rounded-xl border border-border text-sm">
    {details.map((detail) => (
      <div
        key={detail.label}
        className="grid min-w-0 grid-cols-[8rem_minmax(0,1fr)] items-baseline gap-x-4 px-3 py-2 max-sm:grid-cols-1 max-sm:gap-y-0.5"
      >
        <dt className="text-muted-foreground">{detail.label}</dt>
        <dd className="min-w-0 break-words text-foreground">{detail.value}</dd>
      </div>
    ))}
  </dl>
);

/**
 * An open form's or picker's actions, in the bar at the panel's bottom as a
 * dialog's footer is; inline where there is no panel around it.
 */
const PanelFooter = ({ children }: { children: ReactNode }) => {
  const slot = useContext(PanelFooterSlotContext);
  const footer = <CardFooter className="flex-wrap">{children}</CardFooter>;

  return slot ? createPortal(footer, slot) : footer;
};

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

    <PanelFooter>
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
    </PanelFooter>
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
          className="mt-4 gap-1.5 self-start"
        >
          <Plus className="size-4" />
          {create.label}
        </Button>
      )}

      <div className="mt-4 flex min-h-0 flex-1 flex-col">{children}</div>

      <PanelFooter>
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
      </PanelFooter>
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
