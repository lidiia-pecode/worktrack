"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import Input from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  className?: string;
  label?: string;
  labelClassname?: string;
  description?: string;
};

export const PasswordInput = (props: Props) => {
  const [show, setShow] = useState(false);

  return (
    <Input
      {...props}
      type={show ? "text" : "password"}
      endAdornment={
        <Button
          type="button"
          variant="ghost"
          size="iconSm"
          onClick={() => setShow((prev) => !prev)}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? (
            <EyeOff className="h-4.5 w-4.5" />
          ) : (
            <Eye className="h-4.5 w-4.5" />
          )}
        </Button>
      }
    />
  );
};
