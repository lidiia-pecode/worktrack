"use client";

import { useState } from "react";
import { useQueries } from "@tanstack/react-query";

import { activityDetailsQuery, ARCHIVE_ACTIVITY } from "@/hooks/useActivities";
import { useActivityCategoriesAllPagesQuery } from "@/hooks/useActivityCategories";
import { ActCategoryStatus } from "@/types/enums";
import { byCount, listNames, nameOrCount } from "@/lib/utils/text";

import { linkedEntities } from "../entity-panel/EntityLink";
import type { Choice } from "../entity-panel/useStagedSelection";
import { FormSelect } from "../shared/FormSelect";
import { ImpactDialog } from "../shared/ImpactDialog";
import { distinctProjects } from "./category-archive";

/** An activity coming in from another category. */
export interface MoveIn extends Choice {
  fromCategory: string;
}

interface CategoryActivityMovesDialogProps {
  category: Choice;
  isOpen: boolean;
  movesIn?: MoveIn[];
  /** Taken out of the category, so each moves to another one or is archived. */
  movesOut?: Choice[];
  loading?: boolean;
  /** Where the activities taken out go: a category's id, or `ARCHIVE_ACTIVITY`. */
  onConfirm: (destination: string) => void;
  onClose: () => void;
}

const names = (choices: Choice[]) =>
  listNames(choices.map((choice) => choice.name));

// "Backend and QA leave Development; Standup leaves Meetings."
const describeMovesIn = (moves: MoveIn[]) => {
  const byCategory = new Map<string, MoveIn[]>();
  moves.forEach((move) =>
    byCategory.set(move.fromCategory, [
      ...(byCategory.get(move.fromCategory) ?? []),
      move,
    ]),
  );

  return [...byCategory]
    .map(
      ([from, group]) =>
        `${names(group)} ${byCount(group.length, "leaves", "leave")} ${from}`,
    )
    .join("; ");
};

const countOf = (choices: Choice[]) =>
  nameOrCount(
    choices.map((choice) => choice.name),
    "activities",
  );

/** An activity is in one category; one taken out of it moves to another or is archived. */
export const CategoryActivityMovesDialog = ({
  category,
  isOpen,
  movesIn = [],
  movesOut = [],
  loading = false,
  onConfirm,
  onClose,
}: CategoryActivityMovesDialogProps) => {
  const takesOut = movesOut.length > 0;
  const activeCategories = useActivityCategoriesAllPagesQuery(
    { status: ActCategoryStatus.ACTIVE },
    { enabled: isOpen && takesOut },
  );
  const [chosen, setChosen] = useState<string>();
  // Their projects, as links, which archiving takes them off.
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
  const destination = chosen ?? targets[0]?.id ?? ARCHIVE_ACTIVITY;
  const archives = takesOut && destination === ARCHIVE_ACTIVITY;
  const destinationName = targets.find(
    (target) => target.id === destination,
  )?.name;
  const forOut = (one: string, many: string) =>
    byCount(movesOut.length, one, many);

  const title =
    movesIn.length > 0 && takesOut
      ? `Change the activities in ${category.name}?`
      : movesIn.length > 0
        ? `Move ${countOf(movesIn)} to ${category.name}?`
        : archives
          ? `Archive ${countOf(movesOut)}?`
          : `Move ${countOf(movesOut)} out of ${category.name}?`;

  const description = [
    movesIn.length > 0 && `${describeMovesIn(movesIn)}.`,
    takesOut &&
      (archives
        ? `${names(movesOut)} ${forOut("is", "are")} archived: nobody can log new time on ${forOut("it", "them")}.`
        : `${names(movesOut)} ${forOut("moves", "move")} to ${destinationName}.`),
    "Time already logged stays as it is.",
  ]
    .filter(Boolean)
    .join(" ");

  const close = () => {
    setChosen(undefined);
    onClose();
  };

  return (
    <ImpactDialog
      isOpen={isOpen}
      title={isOpen ? title : ""}
      description={description}
      affected={[
        {
          label: "Projects that lose them",
          entities: archives
            ? linkedEntities("project", projectsHoldingThem)
            : [],
        },
      ]}
      choice={
        takesOut &&
        !activeCategories.isLoading && (
          <FormSelect
            label={forOut("Where it goes", "Where they go")}
            value={destination}
            options={[
              ...targets.map((target) => ({
                value: target.id,
                label: `Move to ${target.name}`,
              })),
              {
                value: ARCHIVE_ACTIVITY,
                label: forOut("Archive it", "Archive them"),
              },
            ]}
            onValueChange={setChosen}
            disabled={loading}
          />
        )
      }
      confirmText={archives ? "Archive" : "Move"}
      confirmVariant={archives ? "destructive" : "primary"}
      loading={loading}
      confirmDisabled={takesOut && activeCategories.isLoading}
      onConfirm={() => {
        onConfirm(destination);
        setChosen(undefined);
      }}
      onClose={close}
    />
  );
};
