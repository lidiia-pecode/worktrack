import { AuthForm } from "@/app/components/auth/AuthForm";
import { AuthFormWrapper } from "@/app/components/auth/components/AuthFormWrapper";

export default function RegisterPage() {
  return (
    <AuthFormWrapper
      badge="Get started for free"
      title="Your team's flow, unified."
      description="Create your workspace in seconds. Track hours, manage projects, and streamline reporting effortlessly."
    >
      <AuthForm mode="signup" />
    </AuthFormWrapper>
  );
}
