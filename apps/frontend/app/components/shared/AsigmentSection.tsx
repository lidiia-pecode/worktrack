import { Plus } from "lucide-react";

type AssignmentSectionProps = {
  title: string;
  addLabel: string;
  editable?: boolean;
  onOpenDrawer: () => void;
  children: React.ReactNode;
};

export const AssignmentSection = ({
  title,
  addLabel,
  editable = true,
  onOpenDrawer,
  children,
}: AssignmentSectionProps) => {
  return (
    <section>
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
        {title}
      </p>

      <div className="flex flex-wrap gap-2">
        {children}

        {editable && (
          <button
            onClick={onOpenDrawer}
            className="
              flex items-center gap-2
              rounded-full
              border border-dashed border-zinc-300
              bg-white
              py-1 pl-1 pr-3
              text-sm text-zinc-500
              transition-all
              hover:border-blue-400
              hover:bg-blue-50
              hover:text-blue-600
            "
          >
            <div className="flex size-7 items-center justify-center rounded-full bg-zinc-100">
              <Plus size={12} />
            </div>

            {addLabel}
          </button>
        )}
      </div>
    </section>
  );
};
