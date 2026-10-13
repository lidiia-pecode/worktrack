import { Sidebar } from "@/app/components/layout/sidebar";
import { getCurrentUser } from "@/lib/api/server/auth";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <div className="h-full bg-canvas">
      <div className="mx-auto flex h-full max-w-shell flex-col overflow-hidden bg-background md:flex-row 3xl:border-x 3xl:shadow-raised">
        {user && <Sidebar user={user} />}

        {/* From `xl` an open entity panel takes the right of the screen and the page moves aside for it; below, it is a drawer over the page. */}
        <main className="relative min-h-0 flex-1 overflow-y-auto bg-background xl:has-[[data-entity-panel]]:mr-120">
          <div className="mx-auto flex min-h-full w-full max-w-content flex-col p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
