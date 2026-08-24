"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import Input from "@/components/ui/input";
import { fullName, initials } from "@/lib/utils/user";

import { PickerRow } from "./PickerRow";

interface PickableUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string | null;
}

interface MemberPickerProps<T extends PickableUser> {
  candidates: T[];
  excludeIds?: string[];
  onSelect: (user: T) => void;
  placeholder?: string;
  isLoading?: boolean;
}

export function MemberPicker<T extends PickableUser>({
  candidates,
  excludeIds = [],
  onSelect,
  placeholder = "Search people...",
  isLoading = false,
}: MemberPickerProps<T>) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const excluded = new Set(excludeIds);
    const available = candidates.filter((c) => !excluded.has(c.id));

    if (!query.trim()) return available.slice(0, 6);

    const q = query.trim().toLowerCase();

    return available
      .filter(
        (c) =>
          fullName(c).toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [candidates, excludeIds, query]);

  return (
    <div>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />

        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="pl-9"
          disabled={isLoading}
        />
      </div>

      {query.trim() && (
        <div className="mt-2 max-h-56 space-y-0.5 overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-sm">
          {results.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No matches.</p>
          ) : (
            results.map((user) => (
              <PickerRow
                key={user.id}
                selected={false}
                label={fullName(user)}
                subtitle={user.email}
                avatarText={initials(user)}
                onToggle={() => {
                  onSelect(user);
                  setQuery("");
                }}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
