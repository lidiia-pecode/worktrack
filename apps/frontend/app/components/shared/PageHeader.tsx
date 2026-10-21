import { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
} & (
  | { hideTitle?: false; actions?: ReactNode }
  | { hideTitle: true; actions?: never }
);

export const PageHeader = ({
  title,
  description,
  actions,
  hideTitle = false,
}: PageHeaderProps) => {
  // The sidebar's highlight, or the phone header, already names the page, so
  // the h1 stays for assistive technology only.
  if (hideTitle) {
    return (
      <>
        <h1 className="sr-only">{title}</h1>
        {description && (
          <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </>
    );
  }

  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
};
