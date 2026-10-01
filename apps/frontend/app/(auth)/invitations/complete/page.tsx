import { InvitationComplete } from "@/app/components/auth";
import { getCurrentUser } from "@/lib/api/server/auth";

export default async function InvitationCompletePage() {
  const signedInUser = await getCurrentUser();

  return <InvitationComplete signedInEmail={signedInUser?.email ?? null} />;
}
