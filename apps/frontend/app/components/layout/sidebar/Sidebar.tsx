"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { User } from "@/types";
import { UserRole } from "@/types/enums";
import { useOwnerSetupState } from "@/hooks/auth/useOnboarding";

import { Logo } from "../../shared/Logo";
import { CloseButton } from "../../shared/buttons/CloseButton";
import { GettingStartedLink, SidebarNavigation } from "./SidebarNavigation";
import { UserMenu } from "./UserMenu";
import { navigationFor } from "./sidebar-navigation";

interface SidebarProps {
  user: User;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isOwner = user.role === UserRole.OWNER;
  const { data: setupState } = useOwnerSetupState({ enabled: isOwner });
  const isSetupOpen = setupState ? !setupState.setupFinished : false;
  const groups = navigationFor(user.role);

  return (
    <>
      {/* Mobile */}

      <header className="sticky top-0 z-40 border-b border-sidebar-border bg-sidebar text-sidebar-foreground md:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Logo />

          <button
            onClick={() => setIsOpen(true)}
            className="rounded-lg p-2 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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

          <aside className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-sidebar text-sidebar-foreground shadow-xl md:hidden">
            <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
              <Logo />

              <CloseButton onClick={() => setIsOpen(false)} />
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-5">
              <SidebarNavigation
                groups={groups}
                pathname={pathname}
                onNavigate={() => setIsOpen(false)}
              />
            </div>

            {isOwner && (
              <div className="px-3 pb-3">
                <GettingStartedLink
                  isSetupOpen={isSetupOpen}
                  pathname={pathname}
                  onNavigate={() => setIsOpen(false)}
                />
              </div>
            )}

            <div className="border-t border-sidebar-border p-3">
              <UserMenu />
            </div>
          </aside>
        </>
      )}

      {/* Desktop */}

      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">
          <Logo />
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          <SidebarNavigation groups={groups} pathname={pathname} />
        </div>

        {isOwner && (
          <div className="px-3 pb-3">
            <GettingStartedLink isSetupOpen={isSetupOpen} pathname={pathname} />
          </div>
        )}

        <div className="border-t border-sidebar-border p-3">
          <UserMenu />
        </div>
      </aside>
    </>
  );
}
