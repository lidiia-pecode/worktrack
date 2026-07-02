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
        <div className="flex grow max-w-360 mx-auto bg-blue-100">
          <div className="hidden md:flex md:w-1/2 lg:w-3/5 bg-cover bg-center bg-no-repeat bg-time-management"></div>
          <div className="flex w-full md:w-1/2 lg:w-2/5 items-center justify-center px-6 sm:px-8">
            <AuthForm />
          </div>
        </div>
      )}
    </>
  );
}
