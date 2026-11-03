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
      title="Let's get back to it"
      description="Keep track of your work, projects and time"
    >
      <AuthForm mode="login" googleErrorCode={error} />
    </AuthFormWrapper>
  );
}
