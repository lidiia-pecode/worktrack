// "use client";

// import { forwardRef, useId } from "react";

// type InputProps = {
//   label?: string;
//   error?: string;
// } & React.InputHTMLAttributes<HTMLInputElement>;

// export const Input = forwardRef<HTMLInputElement, InputProps>(
//   ({ label, error, id, className = "", ...props }, ref) => {
//     const generatedId = useId();
//     const inputId = id || generatedId;

//     return (
//       <div className="w-full space-y-1.5">
//         {label && (
//           <label
//             htmlFor={inputId}
//             className="block text-sm font-medium text-slate-900 dark:text-slate-100"
//           >
//             {label}
//           </label>
//         )}

//         <input
//           ref={ref}
//           id={inputId}
//           className={`
//             w-full px-4 py-3 rounded-md
//             bg-white dark:bg-slate-900 border
//             text-slate-900 dark:text-slate-100
//             ${error ? "border-red-400" : "border-slate-300 dark:border-slate-700"}
//             focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
//             disabled:opacity-50 disabled:cursor-not-allowed
//             text-base transition
//             ${className}
//           `}
//           {...props}
//         />

//         {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
//       </div>
//     );
//   },
// );

// Input.displayName = "Input";

// export default Input;

"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils/cn";

type InputProps = {
  label?: string;
  error?: string;
  description?: string;
  labelClassname?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      description,
      id,
      className,
      labelClassname,
      disabled,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "block text-sm font-medium text-slate-700 dark:text-slate-300",
              labelClassname,
            )}
          >
            {label}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={
            error
              ? `${inputId}-error`
              : description
                ? `${inputId}-description`
                : undefined
          }
          className={cn(
            "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm",
            "text-slate-900 placeholder:text-slate-400",
            "outline-none transition-colors",
            "dark:bg-slate-950 dark:text-slate-100",
            "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
            "dark:disabled:bg-slate-950/50 dark:disabled:text-slate-500",
            error
              ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
              : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-800",
            className,
          )}
          {...props}
        />

        {description && !error && (
          <p
            id={`${inputId}-description`}
            className="text-xs text-slate-500 dark:text-slate-400"
          >
            {description}
          </p>
        )}

        {error && (
          <p id={`${inputId}-error`} className="text-xs text-red-500">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
