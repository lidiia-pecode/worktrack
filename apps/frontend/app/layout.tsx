import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";

import Providers from "./providers";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "WorkTrack", template: "%s · WorkTrack" },
  description: "Track time across projects, teams, and activities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${instrumentSans.variable} h-full antialiased`}>
      <body className="h-full">
        <Providers>
          {children}

          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
