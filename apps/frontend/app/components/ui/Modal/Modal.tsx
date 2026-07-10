"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  isOpen: boolean;

  maxWidth?: string;

  size?: "sm" | "md" | "lg" | "xl";
  fullHeight?: boolean;
  contentClassName?: string;
}

export const Modal = ({
  children,
  onClose,
  isOpen,

  size = "xl",
  fullHeight = true,
  contentClassName,
}: ModalProps) => {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
    }

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  const sizes = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div
      ref={backdropRef}
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div
        className={cn(
          "relative w-full bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200",
          "rounded-2xl overflow-hidden",
          sizes[size],
          fullHeight ? "h-[86vh] flex flex-col" : "",
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
};
