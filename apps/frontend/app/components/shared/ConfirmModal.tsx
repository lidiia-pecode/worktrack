'use client';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}

export const ConfirmModal = ({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Yes',
  cancelText = 'Cancel',
  onConfirm,
  onClose,
}: ConfirmModalProps) => {
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      {/* overlay */}
      <div className='absolute inset-0 bg-black/50' onClick={onClose} />

      {/* modal */}
      <div className='relative z-10 w-full max-w-md bg-white rounded-xl shadow-xl border p-6'>
        <h2 className='text-lg font-semibold text-gray-800'>{title}</h2>

        <p className='text-sm text-gray-500 mt-2'>{message}</p>

        <div className='flex justify-end gap-3 mt-6'>
          <button
            onClick={onClose}
            className='px-4 py-2 text-sm rounded-md border hover:bg-gray-50'
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            className='px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700'
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
