"use client";

import { Button } from "@/components/ui/button";
import { StandaloneNotice } from "@/app/components/shared/StandaloneNotice";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <StandaloneNotice
      title="Something went wrong"
      message="This page couldn't be shown. Try again, or go back to WorkTrack."
      action={
        <Button type="button" className="w-full" onClick={retry}>
          Try again
        </Button>
      }
    />
  );
}
