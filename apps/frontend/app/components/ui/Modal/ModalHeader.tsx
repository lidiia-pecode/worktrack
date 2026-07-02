import { Pencil, Save, Trash2, X } from "lucide-react";
import Button from "../Button";

type ModalHeaderProps = {
  edit: boolean;
  isAdmin: boolean;
  onToggleEdit: () => void;
  onSave: () => void;
  onClose: () => void;
  onDelete: () => void;
};

export const ModalHeader = ({
  edit,
  isAdmin,
  onToggleEdit,
  onSave,
  onClose,
  onDelete,
}: ModalHeaderProps) => {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
        Project details
      </p>
      <div className="flex items-center gap-2">
        {isAdmin && !edit && (
          <Button
            onClick={onDelete}
            variant="ghost"
            size="iconSm"
            className="md:hover:text-red-500 md:hover:bg-red-50 transition"
          >
            <Trash2 size={15} />
          </Button>
        )}
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
        <Button onClick={onClose} variant="ghost" size="iconSm">
          <X size={16} />
        </Button>
      </div>
    </div>
  );
};
