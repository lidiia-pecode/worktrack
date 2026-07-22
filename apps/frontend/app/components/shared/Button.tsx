"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "google" | "logout";

  size?: "sm" | "md" | "lg" | "xl" | "iconXs" | "iconSm" | "iconMd" | "iconLg";
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  className = "",
  disabled,
  ...props
}) => {
  const baseStyles =
    "w-full inline-flex items-center justify-center font-semibold rounded-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

  const variants = {
    primary: "bg-blue-600 sm:hover:bg-blue-700 text-white shadow-lg",
    secondary:
      "bg-blue-50 text-blue-600 md:hover:bg-blue-100 transition-all duration-200 font-semibold shadow-sm",
    danger: "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100",
    ghost:
      "flex items-center rounded-lg text-zinc-500 md:hover:text-zinc-900 md:hover:bg-zinc-100 active:scale-95 transition-all",
    google:
      "flex items-center justify-center gap-2 bg-slate-600 md:hover:bg-slate-500 text-white ",
    logout:
      "bg-violet-300 text-violet-600 md:bg-transparent md:border md:border-violet-500 md:cursor-pointer md:hover:bg-violet-200 md:py-1.5 md:px-3",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-3 text-base",
    lg: "px-6 py-3 text-base",
    xl: "px-6 py-3 text-2xl",
    iconXs: "p-1.5 rounded-sm",
    iconSm: "p-2",
    iconMd: "p-2.5 rounded-lg",
    iconLg: "p-3 rounded-lg",
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;

export const CloseButton = ({ onClick }: { onClick: () => void }) => (
  <Button
    variant="ghost"
    size="iconSm"
    className="aspect-square max-w-8"
    onClick={onClick}
  >
    <X size={16} />
  </Button>
);
