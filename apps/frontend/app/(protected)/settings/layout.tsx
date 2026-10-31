import type { Metadata } from "next";
import { settings } from "@/app/components/layout/sidebar/sidebar-navigation";

export const metadata: Metadata = { title: settings.label };

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
