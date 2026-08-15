import { getCurrentUser } from "@/lib/api/server/auth";
import { UsersPage } from "@/app/components/users/UsersPage";
import { redirect } from "next/navigation";

export default async function UsersAdminPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }

  return <UsersPage />;
}
