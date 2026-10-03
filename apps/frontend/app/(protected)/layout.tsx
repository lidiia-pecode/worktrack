import { Sidebar } from "@/app/components/layout/sidebar";
import { getCurrentUser } from "@/lib/api/server/auth";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <div className="flex h-full flex-col overflow-hidden md:flex-row">
      {user && <Sidebar user={user} />}

      <main className="relative min-h-0 flex-1 overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  );
}
