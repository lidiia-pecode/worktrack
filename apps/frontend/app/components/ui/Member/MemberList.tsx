import { User } from "@/types";
import { MemberChip } from "./MemberChip";
import { Plus, Users } from "lucide-react";

type MemberListProps = {
  members: User[];
  editable: boolean;
  onRemove: (id: string) => void;
  onOpenDrawer: () => void;
};

export const MemberList = ({
  members,
  editable,
  onRemove,
  onOpenDrawer,
}: MemberListProps) => {
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">
        Team members
      </p>

      <div className="flex flex-wrap gap-2">
        {members.map((u) => (
          <MemberChip
            key={u.id}
            user={u}
            onRemove={editable ? () => onRemove(u.id) : undefined}
          />
        ))}

        {members.length === 0 && !editable && (
          <div className="flex items-center gap-2 text-sm text-zinc-400 py-1">
            <Users size={16} />
            No members assigned yet
          </div>
        )}

        {editable && (
          <button
            onClick={onOpenDrawer}
            className="flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full border border-dashed border-zinc-300 text-zinc-400 text-xs hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <div className="size-6 rounded-full bg-zinc-100 hover:bg-blue-100 flex items-center justify-center transition-colors">
              <Plus size={11} />
            </div>
            Add member
          </button>
        )}
      </div>
    </section>
  );
};
