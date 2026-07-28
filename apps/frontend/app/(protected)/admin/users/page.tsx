import { meServer } from "@/app/api/auth/auth.server";
import { UsersPage } from "@/app/components/users/UsersPage";
import { redirect } from "next/navigation";

export default async function UsersAdminPage() {
  const loggegIn = await meServer("/users");
  if (!loggegIn) {
    redirect("/");
  }

  return <UsersPage />;
}
