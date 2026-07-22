"use client";

import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";

type SelectProps = {
  error?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ error, className = "", children, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative">
          <select
            ref={ref}
            className={`
              w-full appearance-none px-4 py-3 pr-10 rounded-md
              bg-white border
              ${error ? "border-red-400" : "border-slate-300"}
              focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300
              text-base transition disabled:bg-zinc-50 disabled:text-zinc-400
              ${className}
            `}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
        </div>

        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    );
  },
);

Select.displayName = "Select";

export default Select;
