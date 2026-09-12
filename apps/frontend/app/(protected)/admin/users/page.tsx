import { requireManagerAccess } from "@/lib/api/server/auth";
import { UsersContent } from "@/app/components/users/UsersContent";

export default async function UsersAdminPage() {
  await requireManagerAccess();

  return <UsersContent />;
}
