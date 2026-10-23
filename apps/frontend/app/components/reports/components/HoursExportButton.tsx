"use client";

import { FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useHoursExport } from "@/hooks/useHoursReport";
import { DateRange } from "@/lib/utils/report-period";

export const HoursExportButton = ({ range }: { range: DateRange }) => {
  const exportHours = useHoursExport();

  return (
    <Button
      variant="outline"
      size="sm"
      isLoading={exportHours.isPending}
      onClick={() => exportHours.mutate(range)}
    >
      <FileSpreadsheet />
      Export to Excel
    </Button>
  );
};
