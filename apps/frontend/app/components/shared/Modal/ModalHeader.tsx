import { Pencil, Save } from "lucide-react";
import Button, { CloseButton } from "../Button";

type ModalHeaderProps = {
  edit: boolean;
  isAdmin: boolean;
  onToggleEdit: () => void;
  onSave: () => void;
  onClose: () => void;
  title?: string;
};

export const ModalHeader = ({
  edit,
  isAdmin,
  onToggleEdit,
  onSave,
  onClose,
  title = "Details",
}: ModalHeaderProps) => {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
        {title}
      </p>
      <div className="flex items-center gap-2">
        {isAdmin &&
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
