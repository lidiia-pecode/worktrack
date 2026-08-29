"use client";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { UsersRound } from "lucide-react";
import { useAuth } from "@/hooks/auth/useAuth";
import { useUsersInfiniteQuery } from "@/hooks/useUsers";
import { hasManagerAccess } from "@/lib/utils/user";
import { User } from "@/types";
import { UserRole, UserStatus } from "@/types/enums";
import { ResourcePage } from "../shared/resourse/ResourcePage";
import { InviteUserModal } from "./InviteUserModal";
import { UserCard } from "./UserCard";

type UserTab = "active" | "archived";

export function UsersContent() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [tab, setTab] = useState<UserTab>("active");
  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get("onboarding") === "true";
  const { user } = useAuth();
  const canManage = hasManagerAccess(user?.role);
  const status = tab === "active" ? UserStatus.ACTIVE : UserStatus.DEACTIVATED;

  const {
    items: users,
    isLoading,
    isError,
    refetch,
    pagination,
  } = useUsersInfiniteQuery({ status });

  const visibleUsers = useMemo(
    () => users.filter((user) => user.role !== UserRole.OWNER),
    [users],
  );

  const handleTabChange = (nextTab: UserTab) => {
    if (nextTab === tab) {
      return;
    }
    setTab(nextTab);
  };

  return (
    <>
      <ResourcePage<User>
        title="Users"
        description="Manage workspace users, roles and project access."
        items={visibleUsers}
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
        canCreate={canManage && tab === "active"}
        hasNextPage={pagination.hasNextPage}
        isFetchingNextPage={pagination.isFetchingNextPage}
        onFetchNextPage={pagination.fetchNextPage}
        showArchived
        tab={tab}
        onTabChange={handleTabChange}
        renderItem={(user) => <UserCard key={user.id} user={user} />}
      />{" "}
      <InviteUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        isOnboarding={isOnboarding}
      />{" "}
    </>
  );
}
