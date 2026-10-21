import { LockKeyhole } from "lucide-react";

import { requireOwnerAccess } from "@/lib/api/server/auth";
import { GRACE_DAYS } from "@/lib/utils/reporting-period";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { PeriodsContent } from "@/app/components/periods/PeriodsContent";

export default async function PeriodsPage() {
  await requireOwnerAccess();

  return (
    <>
      <PageHeader title="Periods" hideTitle />

      {/* Without a heading, the lock rule is what tells an owner what this page is for. */}
      <p className="mb-5 flex max-w-2xl items-start gap-2.5 rounded-lg border border-brand/20 bg-brand-subtle px-3.5 py-2.5 text-sm text-foreground">
        <LockKeyhole
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-brand"
        />
        Each month locks by itself {GRACE_DAYS} days after it ends, so its hours
        can no longer change. Reopen a locked month to correct it, then close it
        again.
      </p>

      <PeriodsContent />
    </>
  );
}
