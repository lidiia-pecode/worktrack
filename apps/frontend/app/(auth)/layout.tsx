// These pages read their URL (reset tokens, Google results) while rendering,
// so they render per request rather than once at build time.
export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
