import type { Metadata } from "next";

export const metadata: Metadata = { title: "Link Google" };

export default function GoogleLinkLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
