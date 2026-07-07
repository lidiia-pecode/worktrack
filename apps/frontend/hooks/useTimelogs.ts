"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TimelogsClientApi } from "@/app/api/time-logs/time-logs.client";
import { TimelogPayload, UpdateTimelogPayload } from "@/types";

export function useTimelogs() {
  const queryClient = useQueryClient();

  // The backend currently ignores `date`/`dateFrom`/`dateTo` (whitelist strips
  // them until the controller is fixed to use GetTimelogsQuery — see chat notes),
  // so instead of filtering server-side we fetch the most recent entries and
  // derive "today" / "recent" client-side. This works both before and after
  // that backend fix.
  //
  // `page_size` (snake_case) is what the backend actually reads; the shared
  // `PaginationParams` type uses `pageSize` (camelCase), so the value gets
  // silently stripped too. We bypass that here with a direct cast rather than
  // changing the shared type, which is used by Projects/Users lists as well.
  const query = useQuery({
    queryKey: ["timelogs", "recent"],
    queryFn: () =>
      TimelogsClientApi.getAll({ page_size: 25 } as unknown as Parameters<
        typeof TimelogsClientApi.getAll
      >[0]),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["timelogs"] });

  const createTimelog = useMutation({
    mutationFn: (data: TimelogPayload) => TimelogsClientApi.create(data),
    onSuccess: () => {
      invalidate();
      toast.success("Time logged");
    },
  });

  const updateTimelog = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTimelogPayload }) =>
      TimelogsClientApi.update(id, data),
    onSuccess: () => {
      invalidate();
      toast.success("Entry updated");
    },
  });

  const deleteTimelog = useMutation({
    mutationFn: (id: string) => TimelogsClientApi.delete(id),
    onSuccess: () => {
      invalidate();
      toast.success("Entry deleted");
    },
  });

  return { ...query, createTimelog, updateTimelog, deleteTimelog };
}
