import { BACKEND_URL } from "@/lib/constants/backend-url";
import { OwnerSetupState } from "@/types/Onboarding";

import { getCookieHeader } from "./cookie-helper";

export async function getOwnerSetupState(): Promise<OwnerSetupState | null> {
  const res = await fetch(`${BACKEND_URL}/onboarding/owner/setup-state`, {
    cache: "no-store",
    headers: { Cookie: await getCookieHeader() },
  });

  return res.ok ? ((await res.json()) as OwnerSetupState) : null;
}
