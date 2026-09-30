import { AuthForm } from "@/app/components/auth/AuthForm";
import { AuthFormWrapper } from "@/app/components/auth/components/AuthFormWrapper";

export default function RegisterPage() {
  return (
    <AuthFormWrapper
      badge="Start a company"
      title="Start your company."
      description="You become its owner and set up how your company tracks time. Joining a company instead? Use the link in your invitation email."
    >
      <AuthForm mode="signup" />
    </AuthFormWrapper>
  );
}
