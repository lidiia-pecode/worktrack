import { ProjectActivity } from "@/types";
import { Plus, X } from "lucide-react";

type ActivitiesListProps = {
  activities: ProjectActivity[];
  editable: boolean;
  onRemove: (id: string) => void;
  onOpenDrawer: () => void;
};

export const ActivitiesList = ({
  activities,
  editable,
  onRemove,
  onOpenDrawer,
}: ActivitiesListProps) => {
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">
        Project activities
      </p>

      <div className="flex flex-wrap gap-2">
        {activities.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-zinc-50 border border-zinc-200 hover:border-zinc-300 transition-colors"
          >
            <span className="text-sm text-zinc-700 whitespace-nowrap">
              {a.activity.name}
            </span>
            {onRemove && (
              <button
                onClick={() => onRemove(a.id)}
                aria-label={`Remove ${a.activity.name}`}
                className="ml-0.5 text-zinc-300 hover:text-zinc-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-full"
              >
                <X size={13} />
              </button>
            )}
          </div>
        ))}

        {editable && (
          <button
            onClick={onOpenDrawer}
            className="flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full border border-dashed border-zinc-300 text-zinc-400 text-xs hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <div className="size-6 rounded-full bg-zinc-100 hover:bg-blue-100 flex items-center justify-center transition-colors">
              <Plus size={11} />
            </div>
            Add activity
          </button>
        )}
      </div>
    </section>
  );
};
