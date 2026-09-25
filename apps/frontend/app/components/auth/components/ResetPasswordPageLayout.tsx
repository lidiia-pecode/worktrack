import type { ReactNode } from "react";

interface ResetPasswordPageLayoutProps {
  children: ReactNode;
}

export const ResetPasswordPageLayout = ({
  children,
}: ResetPasswordPageLayoutProps) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 pb-10 shadow-sm">
        {children}
      </div>
    </div>
  );
};
