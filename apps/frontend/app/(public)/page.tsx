import { meServerSoft } from "@/app/api/auth/auth.server";
import { Overview } from "../components/homepage/Overview";
import { AuthForm } from "../components/homepage/AuthForm";

export default async function Home() {
  const loggedIn = await meServerSoft();

  return (
    <>
      {loggedIn ? (
        <Overview />
      ) : (
        <div className="flex h-full grow max-w-360 mx-auto bg-blue-100">
          <div className="hidden lg:flex xl:w-4/7 bg-cover bg-center bg-no-repeat bg-time-management"></div>
          <div className="flex w-full xl:w-3/7 items-center justify-center px-6 sm:px-8">
            <AuthForm />
          </div>
        </div>
      )}
    </>
  );
}
