"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import Input from "../../../../components/ui/input";
import { Button } from "@/components/ui/button";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  className?: string;
  label?: string;
  labelClassname?: string;
};

export const PasswordInput = ({
  error,
  className,
  label,
  labelClassname,
  ...props
}: Props) => {
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

      <Button
        type="button"
        variant="ghost"
        size="iconSm"
        onClick={() => setShow((prev) => !prev)}
        aria-label={show ? "Hide password" : "Show password"}
        className={cn(
          "absolute right-3 flex items-center justify-center",
          label ? "top-7" : "top-1.5",
        )}
      >
        {show ? (
          <EyeOff className="h-4.5 w-4.5" />
        ) : (
          <Eye className="h-4.5 w-4.5" />
        )}
      </Button>
    </div>
  );
};
