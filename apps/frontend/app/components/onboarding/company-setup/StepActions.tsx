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

export function StepActions({
  onBack,
  onSkip,
  showBack = true,
  isPending,
  submitLabel = "Continue",
}: StepActionsProps) {
  const canGoBack = showBack && Boolean(onBack);

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

      <div className="flex items-center justify-between">
        {canGoBack ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            disabled={isPending}
            className="text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            Back
          </Button>
        ) : (
          <span />
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onSkip}
          disabled={isPending}
          className="text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Skip for now
        </Button>
      </div>
    </div>
  );
}
