"use client";

import Link from "next/link";

export const InviteHint = () => (
  <>
    Someone new?{" "}
    <Link
      href="/admin/users?create=true"
      className="font-medium text-brand underline-offset-4 hover:underline"
    >
      Invite them from Users
    </Link>
    .
  </>
);
