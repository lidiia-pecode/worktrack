"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { CompaniesClientApi } from "@/lib/api/resources";
import { queryKeys } from "../shared/queryKeys";

export function useCompany() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.company.current,
    queryFn: CompaniesClientApi.get,
    staleTime: 1000 * 60 * 5,
  });

  const update = useMutation({
    mutationFn: CompaniesClientApi.update,

    onSuccess: (company) => {
      queryClient.setQueryData(queryKeys.company.current, company);

      toast.success("Workspace settings updated");
    },
  });

  return {
    company: query.data ?? null,

    query: {
      ...query,
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      isError: query.isError,
      error: query.error ?? null,
      refetch: query.refetch,
    },

    actions: {
      update,
    },
  };
}
