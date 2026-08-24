import { ReactNode } from "react";

interface ResourceCardProps {
  icon?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  onClick?: () => void;
}

export function ResourceCard({
  icon,
  title,
  subtitle,
  actions,
  children,
  footer,
  onClick,
}: ResourceCardProps) {
  const isInteractive = Boolean(onClick);

  const content = (
    <>
      <div className="flex items-start gap-4 p-5">
        {icon && (
          <div
            className="
              flex size-11 shrink-0 items-center justify-center
              rounded-xl
              bg-brand-subtle text-brand
            "
          >
            {icon}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-card-foreground">
            {title}
          </h2>

          {subtitle && <div className="mt-1 text-xs">{subtitle}</div>}
        </div>

        {actions && (
          <div className="flex shrink-0 items-center gap-1">{actions}</div>
        )}
      </div>

      {children && (
        <div className="border-t border-border px-5 py-4">{children}</div>
      )}

      {footer && (
        <div className="border-t border-border px-5 py-3">{footer}</div>
      )}
    </>
  );

  if (isInteractive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="
          w-full text-left
          rounded-2xl border border-border
          bg-card
          shadow-sm
          transition-all
          hover:-translate-y-0.5
          hover:border-brand/30
          hover:shadow-md
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-ring
        "
      >
        {content}
      </button>
    );
  }

  return (
    <article
      className="
        rounded-2xl border border-border
        bg-card
        shadow-sm
      "
    >
      {content}
    </article>
  );
}
