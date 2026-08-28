"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import {
  InvitationFormInputs,
  invitationSchema,
  LoginFormInputs,
  loginSchema,
  SignUpFormInputs,
  signupSchema,
} from "@/lib/forms/schemas/auth.schema";
import { applyServerErrors } from "@/lib/forms/utils";
import { getErrorMessage, isApiValidationError } from "@/lib/api/errors";
import {
  GOOGLE_INVITATION_URL,
  GOOGLE_LOGIN_URL,
  GOOGLE_SIGNUP_URL,
} from "@/lib/constants";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input";
import { GoogleButton } from "../shared/buttons/GoogleButton";
import { PasswordInput } from "../shared/inputs";
import { useAuthActions } from "@/hooks/auth/useAuthActions";
import { useCompleteInvitation } from "@/hooks/auth/useInvitation";

type AuthFormMode = "login" | "signup" | "invitation";

interface AuthFormProps {
  mode: AuthFormMode;
  invitation?: {
    token: string;
    email: string;
    role: string;
  };
}

export const AuthForm = ({ mode, invitation }: AuthFormProps) => {
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
      confirmPassword: "",
    },
  });

  const onLoginSubmit = async (data: LoginFormInputs) => {
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

  const isSubmitting =
    actions.login.isPending ||
    actions.signup.isPending ||
    invitationActions.password.isPending;

  return (
    <div className="w-full rounded-2xl border border-border/80 bg-card/90 p-7 shadow-[0_18px_50px_-30px_rgba(60,45,40,0.35)] backdrop-blur-sm sm:p-8">
      <div className="mb-7">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {isLogin
            ? "Welcome back"
            : isSignup
              ? "Create your workspace"
              : "Complete your account"}
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {isLogin
            ? "Enter your credentials to access your workspace."
            : isSignup
              ? "Set up your account and get started with Worktrack."
              : "Create your account to join this workspace."}
        </p>
      </div>

      {isInvitation && invitation && (
        <div className="mb-7 rounded-xl border border-border/80 bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Email</span>

            <span className="truncate text-sm font-medium text-foreground">
              {invitation.email}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Role</span>

            <Badge variant="neutral">{invitation.role}</Badge>
          </div>
        </div>
      )}

      {isLogin && (
        <form
          className="flex flex-col space-y-4"
          onSubmit={loginForm.handleSubmit(onLoginSubmit)}
        >
          <Input
            placeholder="you@example.com"
            autoComplete="email"
            {...loginForm.register("email")}
            error={loginForm.formState.errors.email?.message}
            disabled={isSubmitting}
          />

          <PasswordInput
            placeholder="Password"
            autoComplete="current-password"
            {...loginForm.register("password")}
            error={loginForm.formState.errors.password?.message}
            disabled={isSubmitting}
          />

          <div className="-mt-1 flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-brand transition-colors hover:text-brand/80 hover:underline"
            >
              Forgot your password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full"
            isLoading={actions.login.isPending}
            disabled={isSubmitting}
          >
            Sign In
          </Button>
        </form>
      )}

      {isSignup && (
        <form
          className="flex flex-col space-y-4"
          onSubmit={signupForm.handleSubmit(onSignupSubmit)}
        >
          <div className="flex gap-3">
            <Input
              placeholder="First Name"
              autoComplete="given-name"
              {...signupForm.register("firstName")}
              error={signupForm.formState.errors.firstName?.message}
              disabled={isSubmitting}
            />

            <Input
              placeholder="Last Name"
              autoComplete="family-name"
              {...signupForm.register("lastName")}
              error={signupForm.formState.errors.lastName?.message}
              disabled={isSubmitting}
            />
          </div>

          <Input
            placeholder="Company Name"
            autoComplete="organization"
            {...signupForm.register("companyName")}
            error={signupForm.formState.errors.companyName?.message}
            disabled={isSubmitting}
          />

          <Input
            placeholder="you@example.com"
            autoComplete="email"
            {...signupForm.register("email")}
            error={signupForm.formState.errors.email?.message}
            disabled={isSubmitting}
          />

          <PasswordInput
            placeholder="Password"
            autoComplete="new-password"
            {...signupForm.register("password")}
            error={signupForm.formState.errors.password?.message}
            disabled={isSubmitting}
          />

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
          className="flex flex-col space-y-4"
          onSubmit={invitationForm.handleSubmit(onInvitationSubmit)}
        >
          <div className="flex gap-3">
            <Input
              placeholder="First Name"
              autoComplete="given-name"
              {...invitationForm.register("firstName")}
              error={invitationForm.formState.errors.firstName?.message}
              disabled={isSubmitting}
            />

            <Input
              placeholder="Last Name"
              autoComplete="family-name"
              {...invitationForm.register("lastName")}
              error={invitationForm.formState.errors.lastName?.message}
              disabled={isSubmitting}
            />
          </div>

          <PasswordInput
            placeholder="Password"
            autoComplete="new-password"
            {...invitationForm.register("password")}
            error={invitationForm.formState.errors.password?.message}
            disabled={isSubmitting}
          />

          <PasswordInput
            placeholder="Confirm Password"
            autoComplete="new-password"
            {...invitationForm.register("confirmPassword")}
            error={invitationForm.formState.errors.confirmPassword?.message}
            disabled={isSubmitting}
          />

          {invitationActions.password.isError && (
            <p className="text-sm text-destructive">
              {getErrorMessage(invitationActions.password.error)}
            </p>
          )}

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

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />

        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          or continue with
        </span>

        <div className="h-px flex-1 bg-border" />
      </div>

      <GoogleButton onClick={handleGoogleAuth} disabled={isSubmitting} />

      {!isInvitation && (
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {isLogin
            ? "Don't have an account yet? "
            : "Already have an account? "}

          <Link
            href={isLogin ? "/register" : "/login"}
            className="ml-1 font-medium text-brand transition-colors hover:text-brand/80 hover:underline"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </Link>
        </p>
      )}
    </div>
  );
};
