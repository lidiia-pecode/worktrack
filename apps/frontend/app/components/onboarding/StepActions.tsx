"use client";

import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

interface StepActionsProps {
  onBack?: () => void;
  onSkip: () => void;
  showBack?: boolean;
  isPending: boolean;
  submitLabel?: string;
}

export const StepActions = ({
  onBack,
  onSkip,
  showBack = true,
  isPending,
  submitLabel = "Continue",
}: StepActionsProps) => {
  const canGoBack = showBack && onBack;

  return (
    <div className="space-y-3 pt-3">
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isPending}
        isLoading={isPending}
      >
        {submitLabel}
      </Button>

      <div className="flex items-center justify-between gap-3">
        {canGoBack ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            disabled={isPending}
            className="text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
          >
            <ChevronLeft className="size-4" />
            Back
          </Button>
        ) : (
          <div />
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onSkip}
          disabled={isPending}
          className="text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-slate-300"
        >
          Skip for now
        </Button>
      </div>
    </div>
  );
};
