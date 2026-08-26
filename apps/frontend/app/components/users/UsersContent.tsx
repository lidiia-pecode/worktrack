"use client";

import { useState } from "react";

import { UsersRound } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useUsersInfiniteQuery } from "@/hooks/useUsers";
import { hasManagerAccess } from "@/lib/utils/user";
import { User } from "@/types";

import { ResourcePage } from "../shared/resourse/ResourcePage";

import { UserCard } from "./UserCard";
import { InviteUserModal } from "./InviteUserModal";
import { useSearchParams } from "next/navigation";
import { UserRole } from "@/types/enums";

export const UsersContent = () => {
  const [inviteOpen, setInviteOpen] = useState(false);

  const {
    items: users,
    isLoading,
    isError,
    refetch,
    pagination,
  } = useUsersInfiniteQuery();
  const { user } = useAuth();

  const canManage = hasManagerAccess(user?.role);

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = pagination;

  const searchParams = useSearchParams();

  const isOnboarding = searchParams.get("onboarding") === "true";

  return (
    <>
      <ResourcePage<User>
        title="Users"
        description="Manage workspace users, roles and project access."
        items={users.filter((u) => u.role !== UserRole.OWNER)}
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
        renderItem={(user) => <UserCard key={user.id} user={user} />}
      />

      <InviteUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        isOnboarding={isOnboarding}
      />
    </>
  );
};
