"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Input from "@/app/components/shared/Input";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  className?: string;
  label?: string;
  labelClassname?: string;
};

export function PasswordInput({
  error,
  className,
  label,
  labelClassname,
  ...props
}: Props) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        label={label}
        type={show ? "text" : "password"}
        error={error}
        className={className}
        labelClassname={labelClassname}
      />

      <button
        type="button"
        onClick={() => setShow((prev) => !prev)}
        aria-label={show ? "Hide password" : "Show password"}
        className={`absolute right-3 flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200 ${
          label ? "top-7" : "top-1.5"
        }`}
      >
        {show ? (
          <EyeOff className="h-4.5 w-4.5" />
        ) : (
          <Eye className="h-4.5 w-4.5" />
        )}
      </button>
    </div>
  );
}
