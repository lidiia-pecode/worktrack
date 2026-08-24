"use client";

import { useState } from "react";

import { UsersRound } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useUsers } from "@/hooks/useUsers";
import { hasManagerAccess } from "@/lib/utils/user";
import { User } from "@/types";

import { ResourcePage } from "../shared/ResourcePage";

import { UserCard } from "./UserCard";
import { InviteUserModal } from "./InviteUserModal";

export const UsersPage = () => {
  const [inviteOpen, setInviteOpen] = useState(false);

  const { items: users, isLoading, isError, refetch, pagination } = useUsers();
  const { user } = useAuth();

  const canManage = hasManagerAccess(user?.role);

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = pagination;

  return (
    <>
      <ResourcePage<User>
        title="Users"
        description="Manage workspace users, roles and project access."
        items={users}
        isLoading={isLoading}
        isError={isError || !canManage}
        onRetry={refetch}
        getSearchValue={(user) =>
          [
            user.firstName,
            user.lastName,
            user.email,
            user.username,
            user.position,
          ]
            .filter(Boolean)
            .join(" ")
        }
        searchPlaceholder="Search users..."
        emptyTitle="No users yet"
        emptyDescription="Invite your first user to start building your workspace."
        emptyIcon={<UsersRound className="size-6" />}
        createLabel="Invite user"
        onCreate={() => setInviteOpen(true)}
        canCreate={canManage}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onFetchNextPage={fetchNextPage}
        renderItem={(user) => (
          <UserCard key={user.id} user={user} canManage={canManage} />
        )}
      />

      <InviteUserModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  );
};
