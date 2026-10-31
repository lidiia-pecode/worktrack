import type { Metadata } from "next";

import { StandaloneNotice } from "@/app/components/shared/StandaloneNotice";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <StandaloneNotice
      title="Page not found"
      message="This address doesn't lead to a page in WorkTrack. It may be mistyped, or the page may have moved."
    />
  );
}
