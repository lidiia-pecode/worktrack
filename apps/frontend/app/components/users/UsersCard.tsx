"use client";

import { User } from "../../../types";

interface UserCardProps {
  user: User;
}

export default function UserCard({ user }: UserCardProps) {
  return (
    <div className="group p-6 border rounded-2xl shadow-sm bg-white hover:shadow-xl transition-all duration-300 border-gray-100 flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
          {user.username}
        </h2>
        <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
          {user.firstName}
        </h2>
        <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
          {user.lastName}
        </h2>
      </div>

      <p className="text-gray-500 mb-6 line-clamp-2 text-sm flex-grow">
        {user.email}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
        <div className="flex items-center gap-2 text-gray-400">
          <span className="text-xs font-medium uppercase tracking-wider">
            Role
          </span>
          <span className="text-sm font-bold text-gray-700 bg-gray-50 px-2 py-0.5 rounded">
            {user.role}
          </span>
        </div>
      </div>
    </div>
  );
}
