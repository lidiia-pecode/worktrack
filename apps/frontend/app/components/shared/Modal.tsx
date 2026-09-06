"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  showCloseButton?: boolean;
};

export const Modal = ({
  isOpen,
  onClose,
  children,
  maxWidth = "max-w-lg",
  showCloseButton = false,
}: ModalProps) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      <div
        className={`relative z-10 flex max-h-[90vh] w-full ${maxWidth} flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 z-20 rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X className="size-4" />
          </button>
        )}

        {children}
      </div>
    </div>,
    document.body,
  );
};
