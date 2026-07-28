"use client";

import { useState } from "react";

import { User, UpdateUserPayload } from "@/types";
import { useUsers } from "@/hooks/useUsers";

import { Modal } from "../shared/Modal/Modal";
import { ModalHeader } from "../shared/Modal/ModalHeader";
import { ConfirmModal } from "../shared/ConfirmModal";
import { FormSection } from "../shared/FormSection";
import { FormSelect } from "../shared/FormSelect";
import { UserRole } from "@/types/enums";
import { ROLE_LABELS } from "@/lib/consts";

const roleOptions = [
  {
    value: UserRole.USER,
    label: ROLE_LABELS[UserRole.USER],
  },
  {
    value: UserRole.ADMIN,
    label: ROLE_LABELS[UserRole.ADMIN],
  },
];

type Props = {
  user: User;
  isAdmin: boolean;
  onClose: () => void;
};

export const UserEditDialog = ({ user, isAdmin, onClose }: Props) => {
  const [edit, setEdit] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [role, setRole] = useState(user.role);
  const [position, setPosition] = useState(user.position ?? "");

  const {
    actions: { updateUser, deleteUser },
  } = useUsers();

  const handleSave = () => {
    const data: UpdateUserPayload = {};

    if (role !== user.role) {
      data.role = role;
    }

    if (position !== (user.position ?? "")) {
      data.position = position;
    }

    if (Object.keys(data).length === 0) {
      setEdit(false);
      return;
    }

    updateUser.mutate(
      { id: user.id, data },
      {
        onSuccess: () => {
          setEdit(false);
        },
      },
    );
  };

  const handleDelete = async () => {
    await deleteUser.mutateAsync(user.id);
    setDeleteOpen(false);
    onClose();
  };

  return (
    <>
      <Modal isOpen onClose={onClose} contentClassName="pb-6" size="lg">
        <ModalHeader
          title="User details"
          edit={edit}
          isAdmin={isAdmin}
          onToggleEdit={() => setEdit((prev) => !prev)}
          onSave={handleSave}
          onClose={onClose}
        />

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-8">
            {/* Avatar & name */}
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-2xl font-semibold shrink-0">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="text-sm text-zinc-500">{user.email}</p>
              </div>
            </div>

            <FormSection label="First Name">
              <span className="text-sm text-zinc-700">{user.firstName}</span>
            </FormSection>

            <FormSection label="Last Name">
              <span className="text-sm text-zinc-700">{user.lastName}</span>
            </FormSection>

            <FormSection label="Username">
              <span className="text-sm text-zinc-700">@{user.username}</span>
            </FormSection>

            <FormSection label="Email">
              <span className="text-sm text-zinc-700">{user.email}</span>
            </FormSection>

            <FormSection label="Position">
              {edit ? (
                <input
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-blue-500"
                  placeholder="Enter position"
                />
              ) : (
                <span className="text-sm text-zinc-700">
                  {user.position || "—"}
                </span>
              )}
            </FormSection>

            <FormSection label="Role">
              {edit ? (
                <FormSelect
                  value={role}
                  onValueChange={(value) => setRole(value as UserRole)}
                  options={roleOptions}
                />
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-200 px-3 py-1 text-xs font-medium">
                  {ROLE_LABELS[user.role]}
                </span>
              )}
            </FormSection>
          </div>
        </div>
      </Modal>

      {isAdmin && (
        <ConfirmModal
          isOpen={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onConfirm={handleDelete}
          loading={deleteUser.isPending}
          title={`Delete "${user.firstName} ${user.lastName}"?`}
          message="This user will be permanently removed. This action cannot be undone."
          confirmText="Delete"
          variant="danger"
        />
      )}
    </>
  );
};
