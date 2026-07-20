"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import Button, { CloseButton } from "../ui/Button";
import { Modal } from "../ui/Modal/Modal";

import { useActivityCategories } from "@/hooks/useActivityCategories";
import { ActCategoryForm, ActCategoryFormData } from "./ActCategoryForm";

export function CreateActCategoryModal() {
  const [isOpen, setIsOpen] = useState(false);

  const {
    actions: { create },
  } = useActivityCategories();

  const handleCreate = async (data: ActCategoryFormData) => {
    await create.mutateAsync(data);

    setIsOpen(false);
  };

  return (
    <>
      <Button
        variant="secondary"
        className="group mb-6"
        onClick={() => setIsOpen(true)}
      >
        <Plus
          size={18}
          className="transition-transform group-hover:rotate-90"
        />

        <span>Create Activity Category</span>
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Create activity category
          </p>

          <div className="flex items-center gap-2">
            <Button
              form="create-activity-form"
              type="submit"
              size="sm"
              disabled={create.isPending}
            >
              {create.isPending ? "Creating..." : "Create"}
            </Button>

            <CloseButton onClick={() => setIsOpen(false)} />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <ActCategoryForm
            formId="create-activity-form"
            defaultValues={{
              name: "",
            }}
            isEditMode
            onSubmit={handleCreate}
          />
        </div>
      </Modal>
    </>
  );
}
