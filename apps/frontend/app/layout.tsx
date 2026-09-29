import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";

import Providers from "./providers";
import { Sidebar } from "./components/layout/sidebar";
import { getCurrentUser } from "../lib/api/server/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WorkTrack",
  description: "Track time across projects, teams, and activities.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden">
        <Providers>
          {/* Only the main area scrolls, so the sidebar never moves. */}
          <div className="flex h-full flex-col md:flex-row">
            {user && <Sidebar user={user} />}

            <main className="min-h-0 flex-1 overflow-y-auto bg-gray-50">
              {children}
            </main>
          </div>

          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
