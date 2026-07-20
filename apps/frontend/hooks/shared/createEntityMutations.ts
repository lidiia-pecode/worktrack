"use client";

import {
  useMutation,
  useQueryClient,
  UseMutationResult,
  QueryKey,
} from "@tanstack/react-query";
import { toast } from "sonner";

type MutationMessages = {
  create?: string;
  update?: string;
  delete?: string;
  restore?: string;
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

  delete: (id: string) => Promise<TDeleteResult>;

  restore?: (id: string) => Promise<TRestoreResult>;
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

  update: UseMutationResult<
    TEntity,
    Error,
    {
      id: string;
      data: TUpdate;
    }
  >;

  delete: UseMutationResult<TDeleteResult, Error, string>;

  restore: UseMutationResult<TRestoreResult, Error, string>;

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
      queryClient.invalidateQueries({
        queryKey: config.queryKey,
      });

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

    const remove = useMutation({
      mutationFn: config.api.delete,

      onSuccess: () => {
        invalidate();

        if (config.messages?.delete) {
          toast.success(config.messages.delete);
        }
      },
    });

    const restore = useMutation({
      mutationFn:
        config.api.restore ??
        (() => {
          throw new Error("Restore is not supported.");
        }),

      onSuccess: () => {
        invalidate();

        if (config.messages?.restore) {
          toast.success(config.messages.restore);
        }
      },
    });

    return {
      create,
      update,
      delete: remove,
      restore,
      canRestore: !!config.api.restore,
    };
  };
}
