"use client";

import { FileSpreadsheet } from "lucide-react";

import { ReportRange } from "@/types";
import { Button } from "@/components/ui/button";
import { useHoursExport } from "@/hooks/useHoursReport";

export const HoursExportButton = ({ range }: { range: ReportRange }) => {
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
