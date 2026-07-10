"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TimelogsClientApi } from "@/app/api/time-logs/time-logs.client";
import {
  GetTimelogsQuery,
  TimelogPayload,
  UpdateTimelogPayload,
} from "@/types";
import { getErrorMessage } from "@/utils/apiError";

type DateRange = { dateFrom: string; dateTo: string };

export function useTimelogs(range: DateRange) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["timelogs", range.dateFrom, range.dateTo],
    queryFn: () =>
      TimelogsClientApi.getAll({
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
        pageSize: 200,
      } as unknown as GetTimelogsQuery),
    enabled: !!range.dateFrom && !!range.dateTo,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["timelogs"] });

  const createTimelog = useMutation({
    mutationFn: (data: TimelogPayload) => TimelogsClientApi.create(data),
    onSuccess: () => {
      invalidate();
      toast.success("Time logged");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const updateTimelog = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTimelogPayload }) =>
      TimelogsClientApi.update(id, data),
    onSuccess: () => {
      invalidate();
      toast.success("Entry updated");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteTimelog = useMutation({
    mutationFn: (id: string) => TimelogsClientApi.delete(id),
    onSuccess: () => {
      invalidate();
      toast.success("Entry deleted");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return { ...query, createTimelog, updateTimelog, deleteTimelog };
}
