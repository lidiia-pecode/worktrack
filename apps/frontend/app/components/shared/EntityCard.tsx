"use client";

import { ReactNode, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

type RootProps = {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
};

const Root = ({ children, onClick, className }: RootProps) => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!onClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <article
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        "group relative flex flex-col gap-4 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-all duration-200",
        onClick &&
          "cursor-pointer hover:shadow-md hover:border-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        className,
      )}
    >
      {children}
    </article>
  );
};

const Header = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={cn("flex items-start justify-between gap-3", className)}>
    {children}
  </div>
);

const Title = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <h3
    className={cn(
      "font-semibold text-zinc-900 truncate leading-snug",
      className,
    )}
  >
    {children}
  </h3>
);

const Description = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "text-sm text-zinc-400 mt-0.5 line-clamp-3 leading-relaxed",
      className,
    )}
  >
    {children}
  </div>
);

const Content = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => <div className={cn("flex flex-col gap-2", className)}>{children}</div>;

const Footer = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cn("flex items-center justify-between mt-auto pt-1", className)}
  >
    {children}
  </div>
);

const Meta = ({
  icon: Icon,
  children,
}: {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  children: ReactNode;
}) => (
  <span className="flex items-center gap-1 text-xs text-zinc-500">
    {Icon && <Icon size={13} />}
    {children}
  </span>
);

export const EntityCard = Object.assign(Root, {
  Header,
  Title,
  Description,
  Content,
  Footer,
  Meta,
});
