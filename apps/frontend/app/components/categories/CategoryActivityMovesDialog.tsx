"use client";

import { useState } from "react";
import { useQueries } from "@tanstack/react-query";

import { activityDetailsQuery } from "@/hooks/useActivities";
import { useActivityCategoriesAllPagesQuery } from "@/hooks/useActivityCategories";
import { ActCategoryStatus } from "@/types/enums";

import type { LinkedEntity } from "../entity-panel/EntityLink";
import type { Choice } from "../entity-panel/use-staged-selection";
import { FormSelect } from "../shared/FormSelect";
import { ImpactDialog } from "../shared/ImpactDialog";

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

const listFormat = new Intl.ListFormat("en", { type: "conjunction" });

const names = (choices: Choice[]) =>
  listFormat.format(choices.map((choice) => choice.name));

const verb = (count: number, one: string, many: string) =>
  count === 1 ? one : many;

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
        ? `${names(group)} ${verb(group.length, "leaves", "leave")} ${from}`
        : `${names(group)} ${verb(group.length, "gets a", "get a")} category`,
    )
    .join("; ");
};

const countOf = (choices: Choice[]) =>
  choices.length === 1 ? choices[0].name : `${choices.length} activities`;

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

/**
 * An activity is in at most one category, and in one while a project links
 * it: taking it off such a category moves it to another, taking it off while
 * no project links it leaves it a draft, and bringing one in takes it from
 * where it is.
 */
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
  // The projects that hold each one, named so the way to free it is a click away.
  const linkedProjects = useQueries({
    queries: isOpen
      ? movesOut.map((move) => activityDetailsQuery(move.id))
      : [],
  });
  const projectsHoldingThem = [
    ...new Map(
      linkedProjects
        .flatMap((query) => query.data?.projects ?? [])
        .map((project) => [project.id, project]),
    ).values(),
  ];
  const projectLinks: LinkedEntity[] = projectsHoldingThem.map((project) => ({
    entity: { type: "project", id: project.id },
    name: project.name,
  }));

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
      `${names(movesOut)} ${verb(movesOut.length, "is", "are")} on ${verb(projectsHoldingThem.length, "a project", "projects")}, and a project only offers activities that have a category. So ${verb(movesOut.length, "it moves", "they move")} to ${destinationName}; to leave ${verb(movesOut.length, "it", "them")} without one, take ${verb(movesOut.length, "it", "them")} off ${verb(movesOut.length, "its", "their")} projects first.`,
    toDrafts.length > 0 &&
      `${names(toDrafts)} ${verb(toDrafts.length, "becomes a draft", "become drafts")}: still active, but not on projects until ${verb(toDrafts.length, "it has", "they have")} a category again.`,
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
      affected={[{ label: "On projects", entities: projectLinks }]}
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
