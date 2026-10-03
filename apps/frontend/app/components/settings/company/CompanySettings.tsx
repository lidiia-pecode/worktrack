"use client";

import { useEffect } from "react";
import { Building2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import {
  CompanyFormValues,
  companySchema,
} from "@/lib/forms/schemas/company.schema";

import Input from "../../../../components/ui/input";
import { FormSelect } from "../../shared/FormSelect";
import { TimeZoneSelect } from "../../shared/TimeZoneSelect";

import { WeekDay } from "@/types/enums";
import { WEEK_START_OPTIONS } from "@/lib/constants";
import { toListedTimeZone } from "@/lib/utils/time-zones";
import { settingsNumberInputClassName } from "../styles/settings-styles";
import { NumberInputControls } from "../components/NumberInputControls";
import { useCompany } from "@/hooks/auth/useCompany";

export const CompanySettings = () => {
  const { company, actions } = useCompany();

  const {
    register,
    control,
    reset,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      companyName: "",
      timezone: "",
      weekStartDay: WeekDay.MONDAY,
      standardWorkHoursPerDay: 0,
    },
  });

  useEffect(() => {
    if (!company) return;

    reset({
      companyName: company.companyName ?? "",
      timezone: toListedTimeZone(company.timezone) ?? company.timezone ?? "",
      weekStartDay: company.weekStartDay ?? WeekDay.MONDAY,
      standardWorkHoursPerDay: company.standardWorkHoursPerDay ?? 0,
    });
  }, [company, reset]);

  const updateWorkHours = (delta: number) => {
    const current = Number(getValues("standardWorkHoursPerDay")) || 0;

    const next = Math.min(24, Math.max(1, current + delta));

    setValue("standardWorkHoursPerDay", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const onSubmit = async (data: CompanyFormValues) => {
    await actions.update.mutateAsync(data);
  };

  return (
    <Card>
      <CardHeader
        icon={Building2}
        title="Company settings"
        description="Manage your company and workspace preferences."
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardBody className="space-y-8">
          <section>
            <div className="mt-4">
              <Input
                label="Company name"
                placeholder="Your company name"
                {...register("companyName")}
                error={errors.companyName?.message}
              />
            </div>
          </section>

          <div className="border-t border-border" />

          <section>
            <h3 className="font-semibold text-foreground">
              Regional preferences
            </h3>

            <p className="mt-1 text-xs text-muted-foreground">
              How the company&apos;s days and weeks are counted.
            </p>

            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <Controller
                name="timezone"
                control={control}
                render={({ field }) => (
                  <TimeZoneSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    error={errors.timezone?.message}
                  />
                )}
              />

              <Controller
                name="weekStartDay"
                control={control}
                render={({ field }) => (
                  <FormSelect
                    id="weekStartDay"
                    label="Week starts on"
                    placeholder="Select day"
                    value={field.value}
                    options={WEEK_START_OPTIONS}
                    error={errors.weekStartDay?.message}
                    onValueChange={field.onChange}
                  />
                )}
              />

              <div>
                <div className="relative">
                  <Input
                    label="Standard work hours / day"
                    type="number"
                    min={1}
                    max={24}
                    step={0.5}
                    placeholder="8"
                    {...register("standardWorkHoursPerDay", {
                      valueAsNumber: true,
                    })}
                    error={errors.standardWorkHoursPerDay?.message}
                    className={settingsNumberInputClassName}
                  />

                  <NumberInputControls
                    onIncrement={() => updateWorkHours(0.5)}
                    onDecrement={() => updateWorkHours(-0.5)}
                  />
                </div>

                {!errors.standardWorkHoursPerDay && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Changing it recalculates Expected hours, past weeks
                    included, for everyone on the company&apos;s default hours.
                  </p>
                )}
              </div>
            </div>
          </section>
        </CardBody>

        <CardFooter>
          <Button
            type="submit"
            variant="primary"
            disabled={!isDirty}
            isLoading={isSubmitting || actions.update.isPending}
          >
            Save changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
