"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentProps } from "react";
import { useForm } from "react-hook-form";

import {
  InvitationFormInputs,
  invitationSchema,
  LoginFormInputs,
  loginSchema,
  SignUpFormInputs,
  signupSchema,
} from "@/lib/forms/schemas/auth.schema";
import { PASSWORD_RULES_HINT } from "@/lib/forms/schemas/password.schema";
import { applyServerErrors } from "@/lib/forms/utils";
import { getErrorMessage, isApiValidationError } from "@/lib/api/errors";
import {
  GOOGLE_INVITATION_URL,
  GOOGLE_LOGIN_URL,
  GOOGLE_SIGNUP_URL,
  googleErrorMessage,
  ROLE_LABELS,
} from "@/lib/constants";
import { UserRole } from "@/types/enums";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input";
import { AuthCard, AuthLink } from "./components/AuthCard";
import { FormAlert } from "../shared/FormAlert";
import { GoogleButton } from "../shared/buttons/GoogleButton";
import { PasswordInput } from "../shared/inputs";
import { useAuthActions } from "@/hooks/auth/useAuthActions";
import { useCompleteInvitation } from "@/hooks/auth/useInvitation";

type AuthFormMode = "login" | "signup" | "invitation";

const HEADINGS: Record<AuthFormMode, { title: string; description: string }> = {
  login: {
    title: "Welcome back",
    description: "Enter your credentials to access your workspace.",
  },
  signup: {
    title: "Create your workspace",
    description: "Set up your account and get started with WorkTrack.",
  },
  invitation: {
    title: "Complete your account",
    description: "Create your account to join your company.",
  },
};

type FieldProps = ComponentProps<typeof Input>;

interface NameRowProps {
  firstName: FieldProps;
  lastName: FieldProps;
}

const NameRow = ({ firstName, lastName }: NameRowProps) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:gap-3">
    <Input label="First name" autoComplete="given-name" {...firstName} />
    <Input label="Last name" autoComplete="family-name" {...lastName} />
  </div>
);

interface AuthFormProps {
  mode: AuthFormMode;
  invitation?: {
    token: string;
    email: string;
    role: UserRole;
    companyName: string;
    teamName: string | null;
  };
  /** From `?error=` after a Google sign-in that returned here. */
  googleErrorCode?: string | null;
}

export const AuthForm = ({
  mode,
  invitation,
  googleErrorCode,
}: AuthFormProps) => {
  // Kept from the first render, so it survives dropping `?error=` below.
  const [googleError, setGoogleError] = useState(() =>
    googleErrorMessage(googleErrorCode),
  );

  // Shown once: a reload or Back should not bring the message back.
  useEffect(() => {
    if (!googleErrorCode) return;

    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    window.history.replaceState(null, "", url);
  }, [googleErrorCode]);

  const router = useRouter();

  const actions = useAuthActions();
  const invitationActions = useCompleteInvitation();

  const isLogin = mode === "login";
  const isSignup = mode === "signup";
  const isInvitation = mode === "invitation";

  const loginForm = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  const signupForm = useForm<SignUpFormInputs>({
    resolver: zodResolver(signupSchema),
  });

  const invitationForm = useForm<InvitationFormInputs>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      password: "",
    },
  });

  const formError = (error: unknown) =>
    error && !isApiValidationError(error) ? getErrorMessage(error) : null;

  const loginError = formError(actions.login.error);
  const signupError = formError(actions.signup.error);
  const invitationError = formError(invitationActions.password.error);

  const onLoginSubmit = async (data: LoginFormInputs) => {
    setGoogleError(null);

    try {
      await actions.login.mutateAsync(data);

      router.replace("/");
      router.refresh();
    } catch (error: unknown) {
      if (!isApiValidationError(error)) return;

      applyServerErrors(error, loginForm.setError);
    }
  };

  const onSignupSubmit = async (data: SignUpFormInputs) => {
    setGoogleError(null);

    try {
      await actions.signup.mutateAsync(data);

      router.replace("/onboarding");
      router.refresh();
    } catch (error: unknown) {
      if (!isApiValidationError(error)) return;

      applyServerErrors(error, signupForm.setError);
    }
  };

  const onInvitationSubmit = async (data: InvitationFormInputs) => {
    if (!invitation?.token) return;

    setGoogleError(null);

    try {
      await invitationActions.password.mutateAsync({
        token: invitation.token,
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
      });
    } catch (error: unknown) {
      if (!isApiValidationError(error)) return;

      applyServerErrors(error, invitationForm.setError);
    }
  };

  const handleGoogleAuth = () => {
    if (isInvitation) {
      if (!invitation?.token) return;

      window.location.replace(
        `${GOOGLE_INVITATION_URL}?token=${encodeURIComponent(
          invitation.token,
        )}`,
      );

      return;
    }

    window.location.replace(isLogin ? GOOGLE_LOGIN_URL : GOOGLE_SIGNUP_URL);
  };

  const footer = isLogin ? (
    <>
      Joining a company? Use the link in your invitation email.
      <br />
      Starting a new one? <AuthLink href="/register">Start a company</AuthLink>
    </>
  ) : isSignup ? (
    <>
      Already have an account? <AuthLink href="/login">Sign in</AuthLink>
    </>
  ) : null;

  const isSubmitting =
    actions.login.isPending ||
    actions.signup.isPending ||
    invitationActions.password.isPending;

  return (
    <AuthCard
      title={HEADINGS[mode].title}
      description={
        isInvitation && invitation
          ? `Create your account to join ${invitation.companyName}.`
          : HEADINGS[mode].description
      }
      footer={footer}
    >
      {googleError && <FormAlert className="mb-6">{googleError}</FormAlert>}

      {isInvitation && invitation && (
        <dl className="mb-7 space-y-3 rounded-xl border border-border/80 bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-sm text-muted-foreground">Company</dt>

            <dd className="truncate text-sm font-medium text-foreground">
              {invitation.companyName}
            </dd>
          </div>

          {invitation.teamName && (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm text-muted-foreground">Team</dt>

              <dd className="truncate text-sm font-medium text-foreground">
                {invitation.teamName}
              </dd>
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <dt className="text-sm text-muted-foreground">Role</dt>

            <dd>
              <Badge variant="neutral">{ROLE_LABELS[invitation.role]}</Badge>
            </dd>
          </div>

          <div className="flex items-center justify-between gap-4">
            <dt className="text-sm text-muted-foreground">Email</dt>

            <dd className="truncate text-sm font-medium text-foreground">
              {invitation.email}
            </dd>
          </div>
        </dl>
      )}

      {isLogin && (
        <form
          noValidate
          className="flex flex-col space-y-4"
          onSubmit={loginForm.handleSubmit(onLoginSubmit)}
        >
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            {...loginForm.register("email")}
            error={loginForm.formState.errors.email?.message}
            disabled={isSubmitting}
          />

          <PasswordInput
            label="Password"
            autoComplete="current-password"
            {...loginForm.register("password")}
            error={loginForm.formState.errors.password?.message}
            disabled={isSubmitting}
          />

          {loginError && <FormAlert>{loginError}</FormAlert>}

          <div className="-mt-1 flex justify-end">
            <AuthLink href="/forgot-password" className="text-xs">
              Forgot your password?
            </AuthLink>
          </div>

          <Button
            type="submit"
            className="w-full"
            isLoading={actions.login.isPending}
            disabled={isSubmitting}
          >
            Sign in
          </Button>
        </form>
      )}

      {isSignup && (
        <form
          noValidate
          className="flex flex-col space-y-4"
          onSubmit={signupForm.handleSubmit(onSignupSubmit)}
        >
          <NameRow
            firstName={{
              ...signupForm.register("firstName"),
              error: signupForm.formState.errors.firstName?.message,
              disabled: isSubmitting,
            }}
            lastName={{
              ...signupForm.register("lastName"),
              error: signupForm.formState.errors.lastName?.message,
              disabled: isSubmitting,
            }}
          />

          <Input
            label="Company name"
            autoComplete="organization"
            {...signupForm.register("companyName")}
            error={signupForm.formState.errors.companyName?.message}
            disabled={isSubmitting}
          />

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            {...signupForm.register("email")}
            error={signupForm.formState.errors.email?.message}
            disabled={isSubmitting}
          />

          <PasswordInput
            label="Password"
            autoComplete="new-password"
            description={PASSWORD_RULES_HINT}
            {...signupForm.register("password")}
            error={signupForm.formState.errors.password?.message}
            disabled={isSubmitting}
          />

          {signupError && <FormAlert>{signupError}</FormAlert>}

          <Button
            type="submit"
            className="w-full"
            isLoading={actions.signup.isPending}
            disabled={isSubmitting}
          >
            Create account
          </Button>
        </form>
      )}

      {isInvitation && (
        <form
          noValidate
          className="flex flex-col space-y-4"
          onSubmit={invitationForm.handleSubmit(onInvitationSubmit)}
        >
          <NameRow
            firstName={{
              ...invitationForm.register("firstName"),
              error: invitationForm.formState.errors.firstName?.message,
              disabled: isSubmitting,
            }}
            lastName={{
              ...invitationForm.register("lastName"),
              error: invitationForm.formState.errors.lastName?.message,
              disabled: isSubmitting,
            }}
          />

          <PasswordInput
            label="Password"
            autoComplete="new-password"
            description={PASSWORD_RULES_HINT}
            {...invitationForm.register("password")}
            error={invitationForm.formState.errors.password?.message}
            disabled={isSubmitting}
          />

          {invitationError && <FormAlert>{invitationError}</FormAlert>}

          <Button
            type="submit"
            className="w-full"
            isLoading={invitationActions.password.isPending}
            disabled={isSubmitting}
          >
            Create account
          </Button>
        </form>
      )}

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />

        <span className="text-xs font-medium tracking-wider text-muted-foreground">
          or
        </span>

        <div className="h-px flex-1 bg-border" />
      </div>

      <GoogleButton onClick={handleGoogleAuth} disabled={isSubmitting} />
    </AuthCard>
  );
};
