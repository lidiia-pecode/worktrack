import Link from "next/link";
import { NavMenu } from "./NavMenu";
import { User } from "../../../types";

type Props = { initialUser?: User | null };

export async function Header({ initialUser }: Props) {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link className="flex gap-2 h-8" href="/">
          <img src="/images/worktrack-logo.webp" alt="app logo" />
          <span className="text-2xl font-bold text-gray-800 tracking-tight">
            WorkTrack
          </span>
        </Link>

        <NavMenu initialUser={initialUser} />
      </div>
    </header>
  );
}
