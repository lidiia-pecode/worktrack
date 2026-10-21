"use client";

import { FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useHoursExport } from "@/hooks/useHoursReport";
import { DateRange } from "@/lib/utils/report-period";

type HoursExportButtonProps = {
  range: DateRange;
  disabled: boolean;
};

export const HoursExportButton = ({
  range,
  disabled,
}: HoursExportButtonProps) => {
  const exportHours = useHoursExport();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled}
      isLoading={exportHours.isPending}
      onClick={() => exportHours.mutate(range)}
    >
      <FileSpreadsheet />
      Export to Excel
    </Button>
  );
};
