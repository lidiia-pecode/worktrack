"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  LoginFormInputs,
  loginSchema,
  SignUpFormInputs,
  signupSchema,
} from "./schemas/auth-form.schemas";
import Input from "../../shared/Input";
import Button from "../../shared/Button";

import { PasswordInput } from "./components/PasswordInput";
import { AuthClient } from "@/app/api/auth/auth.client";

export const AuthForm = () => {
  const [isExisting, setIsExisting] = useState(true);
  const handleToggleIsRegirestred = () => setIsExisting((prev) => !prev);

  const handleGoogleLogin = () => {
    window.location.href = "/api/backend/auth/google";
  };
  const router = useRouter();

  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors, isSubmitting: isLoggingIn },
  } = useForm<LoginFormInputs>({ resolver: zodResolver(loginSchema) });

  const onLoginSubmit = async (data: LoginFormInputs) => {
    try {
      await AuthClient.login(data);
      router.refresh();
      router.push("/projects");
    } catch (err) {
      console.error(err);
    }
  };

  const {
    register: signupRegister,
    handleSubmit: handleSignUpSubmit,
    formState: { errors: signupErrors, isSubmitting: isSigningUp },
  } = useForm<SignUpFormInputs>({ resolver: zodResolver(signupSchema) });

  const onSignUpSubmit = async (data: SignUpFormInputs) => {
    try {
      await AuthClient.signup(data);
      router.refresh();
      router.push("/projects");
    } catch (err) {
      console.error(err);
    }
  };

  const errors = isExisting ? loginErrors : signupErrors;

  return (
    <div className="w-full">
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
        {isExisting ? "Nice to see you again :)" : "Create your account"}
      </h2>

      <form
        className="flex flex-col space-y-4"
        onSubmit={
          isExisting
            ? handleLoginSubmit(onLoginSubmit)
            : handleSignUpSubmit(onSignUpSubmit)
        }
      >
        {!isExisting && (
          <div className="flex gap-2">
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
        )}

        {!isExisting && (
          <Input
            placeholder="Username"
            {...signupRegister("username")}
            error={signupErrors.username?.message}
          />
        )}

        <Input
          placeholder="Email"
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
          isLoading={isExisting ? isLoggingIn : isSigningUp}
        >
          {isExisting ? "Sign In" : "Sign Up"}
        </Button>
      </form>

      <p className="text-sm text-gray-500 text-center mt-4">
        {isExisting
          ? "Don`t have an account yet? "
          : "Already have an account? "}

        <button
          type="button"
          onClick={handleToggleIsRegirestred}
          className="text-blue-600 font-medium hover:underline"
        >
          {isExisting ? "Sign up" : "Sign in"}
        </button>
      </p>

      <div className="flex items-center mt-2 mb-4">
        <div className="flex-1 h-px bg-gray-300" />
        <span className="px-3 text-sm text-gray-500">or</span>
        <div className="flex-1 h-px bg-gray-300" />
      </div>

      <Button isLoading={false} onClick={handleGoogleLogin} variant="google">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/google-icon-logo.svg"
          alt="Google"
          className="w-5 h-5"
        />
        Continue with Google
      </Button>
    </div>
  );
};
