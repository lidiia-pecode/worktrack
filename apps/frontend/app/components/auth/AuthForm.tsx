"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Link from "next/link";

import {
  LoginFormInputs,
  loginSchema,
  SignUpFormInputs,
  signupSchema,
} from "@/lib/forms/schemas/auth.schema";

import { applyServerErrors } from "@/lib/forms/utils";
import { isApiValidationError } from "@/lib/api/errors";

import Input from "../shared/Input";
import Button from "../shared/Button";
import { PasswordInput } from "./components/PasswordInput";
import { GOOGLE_LOGIN_URL, GOOGLE_SIGNUP_URL } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";

interface AuthFormProps {
  mode: "login" | "signup";
}

export const AuthForm = ({ mode }: AuthFormProps) => {
  const { actions } = useAuth();

  const isExisting = mode === "login";
  const router = useRouter();

  const handleGoogleLogin = () => {
    window.location.href = GOOGLE_LOGIN_URL;
  };

  const handleGoogleSignup = () => {
    console.log("GOOGLE SIGNUP CLICK");
    console.log(GOOGLE_SIGNUP_URL);

    window.location.href = GOOGLE_SIGNUP_URL;
  };

  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    setError: setLoginError,
    formState: { errors: loginErrors },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  const {
    register: signupRegister,
    handleSubmit: handleSignUpSubmit,
    setError: setSignupError,
    formState: { errors: signupErrors },
  } = useForm<SignUpFormInputs>({
    resolver: zodResolver(signupSchema),
  });

  const onLoginSubmit = async (data: LoginFormInputs) => {
    try {
      await actions.login.mutateAsync(data);

      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      if (!isApiValidationError(err)) return;

      applyServerErrors(err, setLoginError);

      toast.error(
        Object.values(err.errors ?? {})
          .flat()
          .join("\n"),
      );
    }
  };

  const onSignUpSubmit = async (data: SignUpFormInputs) => {
    try {
      await actions.signup.mutateAsync(data);

      router.push("/onboarding");
      router.refresh();
    } catch (err: unknown) {
      if (!isApiValidationError(err)) return;

      applyServerErrors(err, setSignupError);

      toast.error(
        Object.values(err.errors ?? {})
          .flat()
          .join("\n"),
      );
    }
  };

  const errors = isExisting ? loginErrors : signupErrors;

  return (
    <div className="w-full">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {isExisting ? "Welcome back" : "Create your workspace"}
        </h2>

        <p className="text-sm text-slate-500 mt-1.5">
          {isExisting
            ? "Enter your credentials to access your workspace."
            : "Set up your account and get started with Worktrack."}
        </p>
      </div>

      <form
        className="flex flex-col space-y-4"
        onSubmit={
          isExisting
            ? handleLoginSubmit(onLoginSubmit)
            : handleSignUpSubmit(onSignUpSubmit)
        }
      >
        {!isExisting && (
          <>
            <div className="flex gap-3">
              <Input
                placeholder="First Name"
                {...signupRegister("firstName")}
                error={signupErrors.firstName?.message}
              />

              <Input
                placeholder="Last Name"
                {...signupRegister("lastName")}
                error={signupErrors.lastName?.message}
              />
            </div>

            <Input
              placeholder="Company Name"
              {...signupRegister("companyName")}
              error={signupErrors.companyName?.message}
            />
          </>
        )}

        <Input
          placeholder="you@example.com"
          {...(isExisting ? loginRegister("email") : signupRegister("email"))}
          error={errors.email?.message}
        />

        <PasswordInput
          placeholder="Password"
          {...(isExisting
            ? loginRegister("password")
            : signupRegister("password"))}
          error={errors.password?.message}
        />

        <Button
          type="submit"
          isLoading={
            isExisting ? actions.login.isPending : actions.signup.isPending
          }
        >
          {isExisting ? "Sign In" : "Create account"}
        </Button>
      </form>

      <div className="flex items-center my-6">
        <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />

        <span className="px-3 text-xs uppercase tracking-wide text-slate-400">
          or continue with
        </span>

        <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
      </div>

      <Button
        isLoading={false}
        onClick={isExisting ? handleGoogleLogin : handleGoogleSignup}
        variant="google"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/google-icon-logo.svg"
          alt="Google"
          className="w-5 h-5"
        />
        Continue with Google
      </Button>

      <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-6">
        {isExisting
          ? "Don't have an account yet? "
          : "Already have an account? "}

        <Link
          href={isExisting ? "/register" : "/login"}
          className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
        >
          {isExisting ? "Sign up" : "Sign in"}
        </Link>
      </p>
    </div>
  );
};
