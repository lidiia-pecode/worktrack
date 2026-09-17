"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export const useSetupCompleteRedirect = (isComplete?: boolean) => {
  const router = useRouter();

  useEffect(() => {
    if (isComplete) {
      router.replace("/team");
    }
  }, [isComplete, router]);
};
