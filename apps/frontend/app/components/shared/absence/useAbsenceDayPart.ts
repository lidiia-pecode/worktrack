"use client";

import { Absence } from "@/types";
import { useAbsenceDay } from "@/hooks/useAbsences";
import { formatDuration } from "@/lib/utils/date";

import { partDayError } from "./absence-form-rules";

/** How much of one day: all of it, what logging left, or hours set. */
type AbsenceLength = "whole" | "rest" | "hours";

/**
 * What a form about one day offers and holds: the lengths the day can take,
 * the one in force, its minutes and why they can't be saved. `chosenLength`
 * gives way when the day can't take it, as the server would refuse it.
 */
export const useAbsenceDayPart = ({
  userId,
  date,
  absence,
  offersPart,
  chosenLength,
  setMinutes,
}: {
  userId: string;
  date: string;
  /** The absence being edited, if any. */
  absence?: Absence;
  /** Whether the form is about one day, so part of it can be taken. */
  offersPart: boolean;
  chosenLength: AbsenceLength;
  /** The hours and minutes typed under "Set hours", in minutes. */
  setMinutes: number;
}) => {
  const {
    data: day,
    isError: dayFailed,
    refetch: refetchDay,
  } = useAbsenceDay({ date, userId }, offersPart && !!date);
  const leftOfDay = day
    ? Math.max(0, day.workingMinutes - day.loggedMinutes)
    : 0;
  // "Rest of the day" is what logging left, so it is offered once time is
  // logged and something of the day is left.
  const offersRest =
    !!day &&
    day.loggedMinutes > 0 &&
    leftOfDay > 0 &&
    leftOfDay < day.workingMinutes;
  // A day with time logged can't be away whole, as the server refuses it.
  const canBeWhole = !day || day.loggedMinutes === 0;
  const partLength: AbsenceLength = offersRest ? "rest" : "hours";
  const length: AbsenceLength = !offersPart
    ? "whole"
    : (chosenLength === "whole" && !canBeWhole) ||
        (chosenLength === "rest" && !offersRest)
      ? partLength
      : chosenLength;
  const isPart = length !== "whole";
  const partTotal = length === "rest" ? leftOfDay : setMinutes;

  const lengthOptions: { value: AbsenceLength; label: string }[] = [
    ...(canBeWhole ? [{ value: "whole" as const, label: "Whole day" }] : []),
    ...(offersRest
      ? [
          {
            value: "rest" as const,
            label: `Rest of the day · ${formatDuration(leftOfDay)}`,
          },
        ]
      : []),
    { value: "hours", label: "Set hours" },
  ];

  const partError =
    isPart && day
      ? partDayError({
          minutes: partTotal,
          workingMinutes: day.workingMinutes,
          loggedMinutes: day.loggedMinutes,
          // As on the server: only a new day or more hours are measured again.
          isMeasuredAgainstLogged:
            !absence ||
            date !== absence.startDate ||
            absence.minutes === null ||
            partTotal > absence.minutes,
        })
      : undefined;

  return {
    day,
    dayFailed,
    refetchDay,
    length,
    isPart,
    partTotal,
    partError,
    lengthOptions,
    // Until the day is read, the form doesn't know whether it can be away whole.
    isDayPending: offersPart && !day && !dayFailed,
    // A new absence on a day that time already fills has nothing to take.
    filledDay:
      offersPart &&
      !absence &&
      !!day &&
      day.loggedMinutes > 0 &&
      leftOfDay === 0
        ? day
        : null,
  };
};
