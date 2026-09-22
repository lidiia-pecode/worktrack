"use client";

import { useState } from "react";
import { toast } from "sonner";

import { PlanningRemovalCountQuery } from "@/types";
import { PlanningClientApi } from "@/lib/api/resources";
import { getErrorMessage } from "@/lib/api";

type PendingRemoval = {
  title: string;
  count: number;
  proceed: () => void | Promise<void>;
};

type RemovalRequest = PlanningRemovalCountQuery & {
  title: string;
  proceed: () => void | Promise<void>;
};

const plannedEntries = (count: number) =>
  `${count} planned ${count === 1 ? "entry" : "entries"}`;

/**
 * Removing somebody from a project deletes their plans for it from today
 * onwards. Asks first, naming how many entries go, and skips the question
 * when nothing would be deleted.
 */
export function usePlanningRemovalGuard() {
  const [pending, setPending] = useState<PendingRemoval | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isProceeding, setIsProceeding] = useState(false);

  const confirmRemoval = async ({
    title,
    proceed,
    ...query
  }: RemovalRequest) => {
    if (query.projectIds.length === 0 || query.userIds.length === 0) {
      await proceed();
      return;
    }

    setIsChecking(true);
    let count: number;
    try {
      ({ count } = await PlanningClientApi.countRemovable(query));
    } catch (error) {
      toast.error(getErrorMessage(error));
      return;
    } finally {
      setIsChecking(false);
    }

    if (count === 0) {
      await proceed();
      return;
    }

    setPending({ title, count, proceed });
  };

  const handleConfirm = async () => {
    if (!pending) return;

    setIsProceeding(true);
    try {
      await pending.proceed();
    } catch {
      // Reported by the global mutation handler.
    } finally {
      setIsProceeding(false);
      setPending(null);
    }
  };

  return {
    confirmRemoval,
    isChecking,
    confirmProps: {
      isOpen: pending !== null,
      title: pending?.title,
      message: pending
        ? `This will also delete ${plannedEntries(pending.count)} from today onwards. Past plans are kept.`
        : undefined,
      confirmText: "Remove",
      variant: "danger" as const,
      loading: isProceeding,
      onConfirm: handleConfirm,
      onClose: () => setPending(null),
    },
  };
}
