"use client";

import UserCard from "./UsersCard";
import { User } from "../../../types";

interface UserListProps {
  users: User[];
}

export default function UsersList({ users }: UserListProps) {
  if (!users.length) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100 text-center">
        <div className="text-5xl mb-4 grayscale opacity-40">📋</div>
        <h3 className="text-xl font-bold text-gray-800 mb-1">No tasks found</h3>
        <p className="text-gray-500 max-w-xs">
          It looks like there are no tasks matching your criteria yet.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {users.map((user) => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
