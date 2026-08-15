import { getCurrentUser } from "@/lib/api/server/auth";
import { LandingPage } from "../components/homepage/LandingPage";

export default async function Home() {
  const user = await getCurrentUser();

  return user ? <p>dklsslm</p> : <LandingPage />;
}
