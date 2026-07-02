import React, { useEffect, useRef } from "react";

interface ModalLayoutProps {
  children: React.ReactNode;
  onClose: () => void;
  isOpen: boolean;
  maxWidth?: string;
}

export const Modal = ({
  children,
  onClose,
  isOpen,
  maxWidth = "max-w-4xl",
}: ModalLayoutProps) => {
  const backdropRef = useRef<HTMLDivElement>(null);

  // Закриття по Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <div
      ref={backdropRef}
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-10 bg-black/40 backdrop-blur-sm transition-opacity"
    >
      <div
        className={`relative w-full h-full ${maxWidth} bg-white sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200`}
      >
        {children}
      </div>
    </div>
  );
};
