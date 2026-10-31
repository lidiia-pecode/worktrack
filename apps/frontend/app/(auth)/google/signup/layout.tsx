import type { Metadata } from "next";

export const metadata: Metadata = { title: "Google sign-up" };

export default function GoogleSignupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
