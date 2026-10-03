"use client";

import { useId, useMemo, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon } from "lucide-react";

import {
  Field,
  fieldControlClassName,
  fieldMessageId,
} from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";
import {
  DEFAULT_TIME_ZONE_OPTIONS,
  findTimeZoneOption,
  searchTimeZones,
  type TimeZoneOption,
} from "@/lib/utils/time-zones";

interface TimeZoneSelectProps {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  description?: string;
  disabled?: boolean;
}

/** A saved zone with no listed equivalent still shows, so the field is not blank. */
const unlistedOption = (zone: string): TimeZoneOption => ({
  value: zone,
  label: zone.replaceAll("_", " "),
  isDefault: false,
  searchText: "",
});

/** The main zones of each country, and every other zone through search. */
export const TimeZoneSelect = ({
  label = "Time zone",
  value,
  onValueChange,
  error,
  description,
  disabled,
}: TimeZoneSelectProps) => {
  const inputId = useId();
  const [query, setQuery] = useState("");

  const selected = value
    ? (findTimeZoneOption(value) ?? unlistedOption(value))
    : null;

  const items = useMemo(() => {
    if (query.trim()) return searchTimeZones(query);

    return selected && !selected.isDefault
      ? [selected, ...DEFAULT_TIME_ZONE_OPTIONS]
      : DEFAULT_TIME_ZONE_OPTIONS;
  }, [query, selected]);

  return (
    <Field id={inputId} label={label} description={description} error={error}>
      <Combobox.Root
        items={items}
        filter={null}
        value={selected}
        onValueChange={(option) => {
          if (option) onValueChange(option.value);
        }}
        onInputValueChange={(text, details) =>
          setQuery(details.reason === "input-change" ? text : "")
        }
        itemToStringLabel={(option) => option.label}
        itemToStringValue={(option) => option.value}
        isItemEqualToValue={(option, current) => option.value === current.value}
        disabled={disabled}
      >
        <div className="relative">
          <Combobox.Input
            id={inputId}
            placeholder="Search by country or city"
            aria-invalid={!!error}
            aria-describedby={fieldMessageId(inputId, { error, description })}
            className={cn(fieldControlClassName(!!error), "h-11 pr-10")}
          />
          <Combobox.Trigger
            aria-label="Show time zones"
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground"
          >
            <ChevronDownIcon className="size-4" />
          </Combobox.Trigger>
        </div>

        <Combobox.Portal>
          <Combobox.Positioner
            side="bottom"
            align="start"
            sideOffset={6}
            className="isolate z-50"
          >
            <Combobox.Popup className="max-h-72 w-(--anchor-width) overflow-y-auto rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-lg">
              {!query.trim() && (
                <p className="px-3 pt-1 pb-2 text-xs text-muted-foreground">
                  Main time zones. Type to search every city and region.
                </p>
              )}

              <Combobox.Empty className="px-3 py-2 text-sm text-muted-foreground">
                No time zone matches.
              </Combobox.Empty>

              <Combobox.List>
                {(option: TimeZoneOption) => (
                  <Combobox.Item
                    key={option.value}
                    value={option}
                    className="relative flex cursor-default items-center rounded-md py-2 pr-9 pl-3 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  >
                    {option.label}
                    <Combobox.ItemIndicator className="absolute right-3">
                      <CheckIcon className="size-4" />
                    </Combobox.ItemIndicator>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </Field>
  );
};
