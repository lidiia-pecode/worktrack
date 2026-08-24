"use client";

interface LoadMoreButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  label?: string;
  loadingLabel?: string;
}

export const LoadMoreButton = ({
  onClick,
  isLoading = false,
  label = "Load more",
  loadingLabel = "Loading…",
}: LoadMoreButtonProps) => {
  return (
    <div className="mt-8 flex justify-center">
      <button
        type="button"
        onClick={onClick}
        disabled={isLoading}
        className="rounded-xl border border-border bg-card px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
      >
        {isLoading ? loadingLabel : label}
      </button>
    </div>
  );
};
