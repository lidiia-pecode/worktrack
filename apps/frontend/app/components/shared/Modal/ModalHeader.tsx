import { Button } from "@/components/ui/button";
import { Pencil, Save } from "lucide-react";

import { CloseButton } from "../buttons/CloseButton";

type ModalHeaderProps = {
  title?: string;

  edit?: boolean;
  isAdmin?: boolean;

  onToggleEdit?: () => void;
  onSave?: () => void;
  onClose: () => void;
};

export const ModalHeader = ({
  title = "Details",
  edit = false,
  isAdmin = false,
  onToggleEdit,
  onSave,
  onClose,
}: ModalHeaderProps) => {
  const showEditActions = isAdmin && onToggleEdit;

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-6 py-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
        {title}
      </p>

      <div className="flex items-center gap-2">
        {showEditActions &&
          (edit ? (
            <>
              <Button
                onClick={onSave}
                size="sm"
                className="flex items-center gap-1.5"
              >
                <Save size={13} />
                Save
              </Button>

              <Button onClick={onToggleEdit} variant="ghost" size="sm">
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={onToggleEdit} variant="ghost" size="iconSm">
              <Pencil size={15} />
            </Button>
          ))}

        <CloseButton onClick={onClose} />
      </div>
    </div>
  );
};
