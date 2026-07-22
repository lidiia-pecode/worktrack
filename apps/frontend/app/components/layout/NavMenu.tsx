"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import Button from "../shared/Button";
import { useMe } from "@/hooks/useMe";
import { User } from "../../../types";

type Props = { initialUser?: User | null };

export const NavMenu = ({ initialUser }: Props) => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const { data: user, isLoading } = useMe({ enabled: !!initialUser });

  const loggedIn = !!user;

  const handleLogout = async () => {
    try {
      await fetch("/api/backend/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      console.log("Logout succeed");
      window.location.href = "/";
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const navItems = loggedIn
    ? [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Projects", href: "/projects" },
      ]
    : [{ label: "Home", href: "/" }];

  if (isLoading) {
    return <div className="h-12 w-20 bg-gray-200 rounded-md" />;
  }

  return (
    <div className="relative">
      <button
        className="md:hidden p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 z-50 relative"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {isOpen ? <X size={24} color="white" /> : <Menu size={24} />}
      </button>

      <nav className="hidden md:flex gap-6 items-center">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={`transition-colors py-1.5 ${
                isActive
                  ? "text-blue-600 border-b-2 "
                  : "text-gray-600 hover:text-blue-600"
              }`}
            >
              {item.label}
            </Link>
          );
        })}

        {loggedIn && (
          <Button variant="logout" onClick={handleLogout}>
            Log out
          </Button>
        )}
      </nav>

      {isOpen && (
        <div className="fixed inset-0 z-40 bg-blue-700 bg-opacity-50 flex flex-col items-center justify-center">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-3 right-3 p-2 rounded-full"
          ></button>

          <nav className="flex flex-col gap-6 text-white text-3xl font-semibold items-center">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`transition-colors ${
                    isActive ? "border-b-amber-50" : ""
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {loggedIn && (
              <Button size="xl" variant="logout" onClick={handleLogout}>
                Log out
              </Button>
            )}
          </nav>
        </div>
      )}
    </div>
  );
};
