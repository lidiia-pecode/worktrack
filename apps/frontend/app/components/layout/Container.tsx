import { cn } from "@/lib/utils";
import React from "react";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

const Container = ({ children, className = "" }: ContainerProps) => {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8",
        className,
      )}
    >
      {children}
    </div>
  );
};

export default Container;
