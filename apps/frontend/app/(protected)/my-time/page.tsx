import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/api/server/auth";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { MyTimeView } from "@/app/components/my-time/MyTimeView";
import { myTime } from "@/app/components/layout/sidebar/sidebar-navigation";

export const metadata: Metadata = { title: myTime.label };

export default async function MyTimePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return (
    <>
      <PageHeader title="Review my time" hideTitle />

      <MyTimeView userId={user.id} />
    </>
  );
}
