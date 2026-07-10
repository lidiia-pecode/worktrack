import Button from "../ui/Button";
import { Modal } from "../ui/Modal";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
};

export const ArchiveProjectModal = ({
  open,
  onClose,
  onConfirm,
  isLoading,
}: Props) => {
  return (
    <Modal isOpen={open} onClose={onClose} size="sm" fullHeight={false}>
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl p-6">
        <h2 className="text-lg font-semibold text-zinc-900">
          Archive project?
        </h2>

        <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
          Employees will no longer be able to track time for this project.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            Archive
          </Button>
        </div>
      </div>
    </Modal>
  );
};
