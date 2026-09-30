import { AuthForm } from "@/app/components/auth/AuthForm";
import { AuthFormWrapper } from "@/app/components/auth/components/AuthFormWrapper";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <AuthFormWrapper
      badge="Welcome back"
      title="Pick up right where you left off."
      description="Your timesheet, projects and team's time are where you left them."
    >
      <AuthForm mode="login" googleErrorCode={error} />
    </AuthFormWrapper>
  );
}
