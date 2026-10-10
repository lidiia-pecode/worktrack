"use client";

import { useState } from "react";
import { useQueries } from "@tanstack/react-query";

import { activityDetailsQuery } from "@/hooks/useActivities";
import { useActivityCategoriesAllPagesQuery } from "@/hooks/useActivityCategories";
import { ActCategoryStatus } from "@/types/enums";
import { byCount, listNames, nameOrCount } from "@/lib/utils/text";

import { linkedEntities } from "../entity-panel/EntityLink";
import type { Choice } from "../entity-panel/useStagedSelection";
import { FormSelect } from "../shared/FormSelect";
import { ImpactDialog } from "../shared/ImpactDialog";
import { distinctProjects } from "./category-archive";

/** An activity coming in from another category, or a draft with none. */
export interface MoveIn extends Choice {
  fromCategory: string | null;
}

interface CategoryActivityMovesDialogProps {
  category: Choice;
  isOpen: boolean;
  movesIn?: MoveIn[];
  /** Taken off while on a project, so each moves to another category. */
  movesOut?: Choice[];
  /** Taken off while on no project, so each is left a draft. */
  toDrafts?: Choice[];
  loading?: boolean;
  onConfirm: (destinationId: string | null) => void;
  onClose: () => void;
}

const names = (choices: Choice[]) =>
  listNames(choices.map((choice) => choice.name));

// "Backend and QA leave Development; Standup gets a category."
const describeMovesIn = (moves: MoveIn[]) => {
  const byCategory = new Map<string | null, MoveIn[]>();
  moves.forEach((move) =>
    byCategory.set(move.fromCategory, [
      ...(byCategory.get(move.fromCategory) ?? []),
      move,
    ]),
  );

  return [...byCategory]
    .map(([from, group]) =>
      from
        ? `${names(group)} ${byCount(group.length, "leaves", "leave")} ${from}`
        : `${names(group)} ${byCount(group.length, "gets a", "get a")} category`,
    )
    .join("; ");
};

const countOf = (choices: Choice[]) =>
  nameOrCount(
    choices.map((choice) => choice.name),
    "activities",
  );

const titleFor = (
  category: string,
  movesIn: MoveIn[],
  movesOut: Choice[],
  toDrafts: Choice[],
) => {
  const kinds = [movesIn, movesOut, toDrafts].filter((list) => list.length);
  if (kinds.length > 1) return `Change the activities in ${category}?`;

  if (movesIn.length) return `Move ${countOf(movesIn)} to ${category}?`;
  if (movesOut.length) return `Move ${countOf(movesOut)} out of ${category}?`;
  return `Remove ${countOf(toDrafts)} from ${category}?`;
};

/** An activity is in at most one category, and must keep one while a project links it. */
export const CategoryActivityMovesDialog = ({
  category,
  isOpen,
  movesIn = [],
  movesOut = [],
  toDrafts = [],
  loading = false,
  onConfirm,
  onClose,
}: CategoryActivityMovesDialogProps) => {
  const needsDestination = movesOut.length > 0;
  const activeCategories = useActivityCategoriesAllPagesQuery(
    { status: ActCategoryStatus.ACTIVE },
    { enabled: isOpen && needsDestination },
  );
  const [chosenId, setChosenId] = useState<string>();
  // Its projects, as links, so the user can take it off them first.
  const linkedProjects = useQueries({
    queries: isOpen
      ? movesOut.map((move) => activityDetailsQuery(move.id))
      : [],
  });
  const projectsHoldingThem = distinctProjects(
    linkedProjects.flatMap((query) => query.data?.projects ?? []),
  );

  const targets = activeCategories.items.filter(
    (target) => target.id !== category.id,
  );
  const destinationId = chosenId ?? targets[0]?.id ?? null;
  const destinationName =
    targets.find((target) => target.id === destinationId)?.name ??
    "another category";

  const description = [
    movesIn.length > 0 && `${describeMovesIn(movesIn)}.`,
    needsDestination &&
      `${names(movesOut)} ${byCount(movesOut.length, "is", "are")} on ${byCount(projectsHoldingThem.length, "a project", "projects")}, and a project only offers activities that have a category. So ${byCount(movesOut.length, "it moves", "they move")} to ${destinationName}; to leave ${byCount(movesOut.length, "it", "them")} without one, take ${byCount(movesOut.length, "it", "them")} off ${byCount(movesOut.length, "its", "their")} projects first.`,
    toDrafts.length > 0 &&
      `${names(toDrafts)} ${byCount(toDrafts.length, "becomes a draft", "become drafts")}: still active, but not on projects until ${byCount(toDrafts.length, "it has", "they have")} a category again.`,
    "Projects and logged time stay as they are.",
  ]
    .filter(Boolean)
    .join(" ");

  const onlyDrafts =
    toDrafts.length > 0 && !movesIn.length && !needsDestination;

  const close = () => {
    setChosenId(undefined);
    onClose();
  };

  return (
    <ImpactDialog
      isOpen={isOpen}
      title={isOpen ? titleFor(category.name, movesIn, movesOut, toDrafts) : ""}
      description={description}
      affected={[
        {
          label: "On projects",
          entities: linkedEntities("project", projectsHoldingThem),
        },
      ]}
      choice={
        needsDestination &&
        !activeCategories.isLoading &&
        (targets.length > 0 ? (
          <FormSelect
            label="Move to"
            value={destinationId ?? undefined}
            options={targets.map((target) => ({
              value: target.id,
              label: target.name,
            }))}
            onValueChange={setChosenId}
            disabled={loading}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            There is no other active category to move to. Create one first.
          </p>
        ))
      }
      confirmText={onlyDrafts ? "Remove" : "Move"}
      confirmVariant={onlyDrafts ? "destructive" : "primary"}
      loading={loading}
      confirmDisabled={needsDestination && !destinationId}
      onConfirm={() => {
        onConfirm(destinationId);
        setChosenId(undefined);
      }}
      onClose={close}
    />
  );
};
