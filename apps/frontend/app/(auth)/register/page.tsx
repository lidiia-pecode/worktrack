import { AuthForm, AuthFormWrapper } from "@/app/components/auth";

interface RegisterPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const { error } = await searchParams;

  return (
    <AuthFormWrapper
      badge="Start a company"
      title="Start your company."
      description="You become its owner and set up how your company tracks time. Joining a company instead? Use the link in your invitation email."
    >
      <AuthForm mode="signup" googleErrorCode={error} />
    </AuthFormWrapper>
  );
}
