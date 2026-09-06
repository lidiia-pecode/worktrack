"use client";

import {
  QueryKey,
  useMutation,
  useQueryClient,
  UseMutationResult,
} from "@tanstack/react-query";

import { toast } from "sonner";

type MutationMessages = {
  create?: string;
  update?: string;
  delete?: string;
  archive?: string;
  unarchive?: string;
};

type EntityMutationApi<
  TEntity,
  TCreate,
  TUpdate,
  TDeleteResult = void,
  TRestoreResult = void,
> = {
  create: (payload: TCreate) => Promise<TEntity>;

  update: (id: string, payload: TUpdate) => Promise<TEntity>;
  delete?: (id: string) => Promise<TDeleteResult>;
  archive?: (id: string) => Promise<TDeleteResult>;
  unarchive?: (id: string) => Promise<TRestoreResult>;
};

type CreateEntityMutationsConfig<
  TEntity,
  TCreate,
  TUpdate,
  TDeleteResult = void,
  TRestoreResult = void,
> = {
  queryKey: QueryKey;

  api: EntityMutationApi<
    TEntity,
    TCreate,
    TUpdate,
    TDeleteResult,
    TRestoreResult
  >;

  messages?: MutationMessages;
};

export type EntityMutations<
  TEntity,
  TCreate,
  TUpdate,
  TDeleteResult = void,
  TRestoreResult = void,
> = {
  create: UseMutationResult<TEntity, Error, TCreate>;
  update: UseMutationResult<TEntity, Error, { id: string; data: TUpdate }>;
  delete: UseMutationResult<TDeleteResult, Error, string>;
  archive: UseMutationResult<TDeleteResult, Error, string>;

  unarchive: UseMutationResult<TRestoreResult, Error, string>;
  canDelete: boolean;
  canArchive: boolean;
  canRestore: boolean;
};

export function createEntityMutations<
  TEntity,
  TCreate,
  TUpdate,
  TDeleteResult = void,
  TRestoreResult = void,
>(
  config: CreateEntityMutationsConfig<
    TEntity,
    TCreate,
    TUpdate,
    TDeleteResult,
    TRestoreResult
  >,
) {
  return function useEntityMutations(): EntityMutations<
    TEntity,
    TCreate,
    TUpdate,
    TDeleteResult,
    TRestoreResult
  > {
    const queryClient = useQueryClient();

    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: config.queryKey });
    const create = useMutation({
      mutationFn: config.api.create,

      onSuccess: () => {
        invalidate();

        if (config.messages?.create) {
          toast.success(config.messages.create);
        }
      },
    });

    const update = useMutation({
      mutationFn: ({ id, data }: { id: string; data: TUpdate }) =>
        config.api.update(id, data),

      onSuccess: () => {
        invalidate();

        if (config.messages?.update) {
          toast.success(config.messages.update);
        }
      },
    });
    const deleteMutation = useMutation({
      mutationFn:
        config.api.delete ??
        (() => {
          throw new Error("Delete is not supported.");
        }),
      onSuccess: () => {
        invalidate();
        if (config.messages?.delete) {
          toast.success(config.messages.delete);
        }
      },
    });
    const archive = useMutation({
      mutationFn:
        config.api.archive ??
        (() => {
          throw new Error("Archive is not supported.");
        }),
      onSuccess: () => {
        invalidate();

        if (config.messages?.archive) {
          toast.success(config.messages.archive);
        }
      },
    });

    const unarchive = useMutation({
      mutationFn:
        config.api.unarchive ??
        (() => {
          throw new Error("Restore is not supported.");
        }),

      onSuccess: () => {
        invalidate();

        if (config.messages?.unarchive) {
          toast.success(config.messages.unarchive);
        }
      },
    });

    return {
      create,
      update,
      delete: deleteMutation,
      archive,
      unarchive,
      canDelete: !!config.api.delete,
      canArchive: !!config.api.archive,
      canRestore: !!config.api.unarchive,
    };
  };
}
