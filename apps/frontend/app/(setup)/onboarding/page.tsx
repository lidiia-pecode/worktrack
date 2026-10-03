import { requireOwnerAccess } from "@/lib/api/server/auth";
import { CompanySetupWizard } from "@/app/components/onboarding/company-setup/CompanySetupWizard";

export default async function OnboardingPage() {
  await requireOwnerAccess();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-12 sm:px-8 lg:px-10">
      <CompanySetupWizard />
    </main>
  );
}
