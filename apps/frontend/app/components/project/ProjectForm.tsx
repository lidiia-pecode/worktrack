import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ProjectStatus } from "@/types/enums";
import { StatusBadge } from "../ui/StatusBadge";

const projectSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .nonempty("Name is required"),
  description: z.string().optional(),
  estimate: z.coerce.number().min(1, "Estimate must be at least 1h"),
  status: z.enum(ProjectStatus),
});

export type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectFormProps {
  defaultValues: ProjectFormData;
  onSubmit: (data: ProjectFormData) => void;
  isEditMode: boolean;
  formId: string;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({
  defaultValues,
  onSubmit,
  isEditMode,
  formId,
}) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProjectFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(projectSchema) as any,
    defaultValues,
  });

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Назва проекту */}
      <div>
        {isEditMode ? (
          <div className="flex flex-col gap-1">
            <input
              {...register("name")}
              placeholder="Project name"
              className={`text-2xl font-semibold w-full border-b-2 outline-none pb-1 transition-colors
              ${errors.name ? "border-red-400 placeholder:text-red-300" : "border-zinc-200 focus:border-blue-500"}`}
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>
        ) : (
          <h1 className="text-2xl font-semibold text-zinc-900">
            {defaultValues.name}
          </h1>
        )}
      </div>

      {/* Поля: Estimate та Status */}
      <div className="flex gap-10">
        {/* Estimate */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Estimate
          </label>
          {isEditMode ? (
            <div className="flex flex-col gap-1">
              <div className="relative border-b w-24">
                <input
                  {...register("estimate")}
                  type="number"
                  placeholder="0"
                  className="w-full outline-none bg-transparent pr-8"
                  min={1}
                />
                <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                  hours
                </span>
              </div>
              {errors.estimate && (
                <p className="text-xs text-red-500">
                  {errors.estimate.message}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm font-medium text-zinc-800">
              {defaultValues.estimate > 0 ? `${defaultValues.estimate}h` : "—"}
            </p>
          )}
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Status
          </label>
          {isEditMode ? (
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <div className="flex gap-2">
                  {[ProjectStatus.ACTIVE].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => field.onChange(s)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
                        ${
                          field.value === s
                            ? "bg-zinc-900 text-white border-zinc-900"
                            : "border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50"
                        }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            />
          ) : (
            <StatusBadge status={defaultValues.status} size="md" />
          )}
        </div>
      </div>

      {/* Опис */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">
          Description
        </p>
        <textarea
          {...register("description")}
          readOnly={!isEditMode}
          placeholder={isEditMode ? "Add a description…" : ""}
          rows={4}
          className={`w-full text-sm text-zinc-700 leading-relaxed resize-none rounded-xl outline-none transition
            ${
              isEditMode
                ? "p-3 border border-zinc-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                : "p-0 bg-transparent text-zinc-500 cursor-default"
            }`}
        />
        {!isEditMode && !defaultValues.description && (
          <p className="text-sm text-zinc-400 italic">
            No description provided
          </p>
        )}
      </section>
    </form>
  );
};
