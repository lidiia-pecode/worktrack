import { AuthForm } from "@/app/components/auth/AuthForm";
import { AuthFormWrapper } from "@/app/components/auth/components/AuthFormWrapper";

export default function LoginPage() {
  return (
    <AuthFormWrapper
      badge="Welcome back"
      title="Pick up right where you left off."
      description="Your time logs, projects, and team updates are waiting for you. Let's get things done."
    >
      <AuthForm mode="login" />
    </AuthFormWrapper>
  );
}
