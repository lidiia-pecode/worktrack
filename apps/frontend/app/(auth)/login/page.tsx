import type { Metadata } from "next";
import { AuthForm, AuthFormWrapper } from "@/app/components/auth";

export const metadata: Metadata = { title: "Sign in" };

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <AuthFormWrapper
      badge="Sign in"
      title="Pick up right where you left off."
      description="Your timesheet, projects and team's time are where you left them."
    >
      <AuthForm mode="login" googleErrorCode={error} />
    </AuthFormWrapper>
  );
}
