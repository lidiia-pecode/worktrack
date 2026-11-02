"use client";

import { FileSpreadsheet } from "lucide-react";

import { ReportQuery } from "@/types";
import { Button } from "@/components/ui/button";
import { useHoursExport } from "@/hooks/useHoursReport";

export const HoursExportButton = ({ query }: { query: ReportQuery }) => {
  const exportHours = useHoursExport();

  return (
    <Button
      variant="outline"
      size="sm"
      isLoading={exportHours.isPending}
      onClick={() => exportHours.mutate(query)}
    >
      <FileSpreadsheet />
      Export to Excel
    </Button>
  );
};
