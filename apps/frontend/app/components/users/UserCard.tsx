"use client";

import { useState } from "react";
import { Mail, UserRound } from "lucide-react";

import { User } from "@/types";
import { ROLE_LABELS } from "@/lib/constants";

import { Badge } from "@/components/ui/badge";

import { ResourceCard } from "../shared/resourse/ResourceCard";
import { ResourceCardField } from "../shared/resourse/ResourceCardField";
import { Avatar } from "../shared/Avatar";
import { UpdateUserModal } from "./UpdateUserModal";

type Props = {
  user: User;
};

export const UserCard = ({ user }: Props) => {
  const [open, setOpen] = useState(false);

  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <>
      <ResourceCard
        onClick={() => setOpen(true)}
        icon={<Avatar user={user} size="lg" />}
        title={fullName}
        subtitle={<Badge>{ROLE_LABELS[user.role] ?? user.role}</Badge>}
      >
        <div className="space-y-2.5">
          <ResourceCardField
            label="Email"
            icon={<Mail className="size-3.5" />}
            value={user.email}
          />

          <ResourceCardField
            label="Position"
            icon={<UserRound className="size-3.5" />}
            value={user.position || "No position"}
          />
        </div>
      </ResourceCard>

      {open && <UpdateUserModal user={user} onClose={() => setOpen(false)} />}
    </>
  );
};
