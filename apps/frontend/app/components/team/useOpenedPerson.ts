"use client";

import { useCallback } from "react";

import { useOpenedEntry } from "../shared/useOpenedEntry";

export const PERSON_PARAM = "person";

const PARAMS = [PERSON_PARAM] as const;

/** The person whose week the Team time panel shows, kept in `?person=<id>`. */
export const useOpenedPerson = () => {
  const { opened, open, close } = useOpenedEntry(PARAMS);

  const openPerson = useCallback(
    (id: string) => open(PERSON_PARAM, id),
    [open],
  );

  return { personId: opened?.id ?? null, open: openPerson, close };
};
