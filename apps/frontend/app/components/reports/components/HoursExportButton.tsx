"use client";

import { FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useHoursExport } from "@/hooks/useHoursReport";

import { DateRange } from "./ReportFilters";

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
    // The top margin is the height of a field label, so the button lines up
    // with the inputs even when one shows an error below it.
    <Button
      variant="outline"
      size="lg"
      className="sm:mt-6.5 sm:ml-auto"
      disabled={disabled}
      isLoading={exportHours.isPending}
      onClick={() => exportHours.mutate(range)}
    >
      <FileSpreadsheet />
      Export to Excel
    </Button>
  );
};
