import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/api/server/auth";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { MyTimeView } from "@/app/components/my-time/MyTimeView";

export default async function MyTimePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return (
    <>
      <PageHeader title="My time" hideTitle />

      <MyTimeView userId={user.id} />
    </>
  );
}
