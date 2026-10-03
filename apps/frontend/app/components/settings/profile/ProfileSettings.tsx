"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { User } from "@/types";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import {
  ProfileFormValues,
  profileSchema,
} from "@/lib/forms/schemas/profile.schema";
import Input from "../../../../components/ui/input";
import { useProfile } from "@/hooks/auth/useProfile";

interface ProfileSettingsProps {
  user: User | null;
}

export const ProfileSettings = ({ user }: ProfileSettingsProps) => {
  const { actions } = useProfile();

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
    },
  });

  useEffect(() => {
    if (!user) return;

    reset({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
    });
  }, [user, reset]);

  const onSubmit = (data: ProfileFormValues) => {
    actions.update.mutate({
      firstName: data.firstName,
      lastName: data.lastName,
    });
  };

  return (
    <Card>
      <CardHeader
        title="Profile"
        description="Manage your personal information."
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardBody className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <Input
              label="First name"
              {...register("firstName")}
              error={errors.firstName?.message}
            />

            <Input
              label="Last name"
              {...register("lastName")}
              error={errors.lastName?.message}
            />
          </div>

          <Input label="Email" value={user?.email ?? ""} disabled />
        </CardBody>

        <CardFooter>
          <Button
            type="submit"
            variant="primary"
            disabled={!isDirty}
            isLoading={actions.update.isPending}
          >
            Save changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
