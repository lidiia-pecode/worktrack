"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { UserMenu } from "./UserMenu";
import { CloseButton } from "../../shared/Button";
import { Logo } from "../../shared/Logo";
import { SidebarNavigation } from "./SidebarNavigation";
import { employeeNavigation, managerNavigation } from "./sidebar-navigation";
import { User } from "@/types";
import { hasManagerAccess } from "@/lib/utils/user";

interface SidebarProps {
  user: User;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const canManage = hasManagerAccess(user?.role);
  const navlist = canManage ? managerNavigation : employeeNavigation;

  return (
    <>
      {/* Mobile */}

      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white md:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Logo />

          <button
            onClick={() => setIsOpen(true)}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 md:hidden"
            onClick={() => setIsOpen(false)}
          />

          <aside className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-white shadow-xl md:hidden">
            <div className="flex h-16 items-center justify-between border-b border-gray-100 px-4">
              <Logo />

              <CloseButton onClick={() => setIsOpen(false)} />
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <SidebarNavigation
                navItems={navlist}
                pathname={pathname}
                onNavigate={() => setIsOpen(false)}
              />
            </div>

            <div className="border-t border-gray-100 p-4">
              <UserMenu />
            </div>
          </aside>
        </>
      )}

      {/* Desktop */}

      <aside className="hidden h-screen w-50 flex-col border-r border-gray-200 bg-white md:flex">
        <div className="border-b border-gray-100 px-6 py-5">
          <Logo />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <SidebarNavigation
            navItems={navlist}
            pathname={pathname}
            isDesktop={true}
          />
        </div>

        <div className="border-t border-gray-100 p-4">
          <UserMenu isDesktop={true} />
        </div>
      </aside>
    </>
  );
}
