"use client";

import { useState, useMemo } from "react";

import Container from "../layout/Container";
import { useUsers } from "@/hooks/useUsers";
import { useAuth } from "@/hooks/useAuth";

import { EntityList } from "../shared/EntityList";
import { LoadingState } from "../shared/LoadingState";
import { ErrorState } from "../shared/ErrorState";
import { EmptyState } from "../shared/EmptyState";
import { UserCard } from "./UserCard";
import { Search, UsersRound } from "lucide-react";
import { hasManagerAccess } from "@/lib/utils/user";

export const UsersPage = () => {
  const { items: users, isLoading, isError, refetch, pagination } = useUsers();
  const { user } = useAuth();
  const canManage = hasManagerAccess(user?.role);

  const [search, setSearch] = useState("");

  console.log(users);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase();
      return (
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q)
      );
    });
  }, [users, search]);

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = pagination;

  if (isLoading) {
    return (
      <Container className="flex flex-col grow">
        <LoadingState
          title="Loading users"
          description="Fetching your users..."
        />
      </Container>
    );
  }

  if (isError || !canManage) {
    return (
      <Container className="flex flex-col grow">
        <ErrorState title="Couldn't load users" onRetry={refetch} />
      </Container>
    );
  }

  if (!users.length) {
    return (
      <Container className="flex flex-col grow">
        <EmptyState
          title="No users yet"
          description="Users will appear here once they sign up."
          icon={<UsersRound className="h-8 w-8 text-muted-foreground" />}
        />
      </Container>
    );
  }

  return (
    <Container className="flex flex-col grow">
      {/* Search bar */}
      <div className="relative flex-1 mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or username"
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder:text-zinc-400"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            title={
              search ? "No users match your search" : "No users in this view"
            }
            description={search ? "Try a different search term." : undefined}
            icon={<UsersRound className="h-8 w-8 text-muted-foreground" />}
          />
        </div>
      ) : (
        <>
          <EntityList
            items={filtered}
            renderItem={(user) => (
              <UserCard key={user.id} user={user} canManage={canManage} />
            )}
          />

          {hasNextPage && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="px-6 py-2.5 text-sm font-medium rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 disabled:opacity-50 transition-colors"
              >
                {isFetchingNextPage ? "Loading more\u2026" : "Load more users"}
              </button>
            </div>
          )}
        </>
      )}
    </Container>
  );
};
