"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { CompaniesClientApi } from "@/lib/api/resources";
import { Company } from "@/types/Company";
import { queryKeys } from "../shared/queryKeys";
import { useRefreshAfterCapacityChange } from "../useCapacity";

interface UseCompanyOptions {
  /** For a form that shows a failed save itself, instead of the global toast. */
  showsSaveErrorInline?: boolean;
}

export function useCompany({
  showsSaveErrorInline = false,
}: UseCompanyOptions = {}) {
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

      toast.success("Company settings updated");
    },

    ...(showsSaveErrorInline && { onError: () => {} }),
  });

  // The standard day feeds everyone's Expected on the company default.
  const refreshCapacity = useRefreshAfterCapacityChange();
  const afterStandardDayChange = (company: Company, message: string) => {
    queryClient.setQueryData(queryKeys.company.current, company);
    refreshCapacity();
    toast.success(message);
  };

  const setStandardDay = useMutation({
    mutationFn: CompaniesClientApi.setStandardDay,
    onSuccess: (company) =>
      afterStandardDayChange(company, "Standard work day updated"),
  });

  const cancelStandardDayChange = useMutation({
    mutationFn: CompaniesClientApi.cancelStandardDayChange,
    onSuccess: (company) =>
      afterStandardDayChange(company, "Standard work day change cancelled"),
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
      setStandardDay,
      cancelStandardDayChange,
    },
  };
}
