import type { Metadata } from "next";
import { InvitationComplete } from "@/app/components/auth";
import { getCurrentUser } from "@/lib/api/server/auth";

export const metadata: Metadata = { title: "Invitation" };

export default async function InvitationCompletePage() {
  const signedInUser = await getCurrentUser();

  return <InvitationComplete signedInEmail={signedInUser?.email ?? null} />;
}
