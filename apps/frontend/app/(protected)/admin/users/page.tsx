import { UsersContent } from "@/app/components/users/UsersContent";
import { getCurrentUser } from "@/lib/api/server/auth";
import { redirect } from "next/navigation";

export default async function UsersAdminPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }

  return <UsersContent />;
}
