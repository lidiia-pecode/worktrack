"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { User } from "@/types";
import { UserRole } from "@/types/enums";
import { useOwnerSetupState } from "@/hooks/auth/useOnboarding";
import {
  Dialog,
  DialogClose,
  DialogSidePanel,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Logo } from "../../shared/Logo";
import { CloseButton } from "../../shared/buttons/CloseButton";
import { GettingStartedLink, SidebarNavigation } from "./SidebarNavigation";
import { UserMenu } from "./UserMenu";
import { navigationFor } from "./sidebar-navigation";

const DESKTOP_MEDIA_QUERY = "(min-width: 48rem)";

interface SidebarBodyProps {
  user: User;
  pathname: string;
  onNavigate?: () => void;
}

const SidebarBody = ({ user, pathname, onNavigate }: SidebarBodyProps) => {
  const isOwner = user.role === UserRole.OWNER;
  const { data: setupState } = useOwnerSetupState({ enabled: isOwner });
  const isSetupOpen = setupState ? !setupState.setupFinished : false;

  return (
    <>
      <div className="flex-1 overflow-y-auto px-3 py-5">
        <SidebarNavigation
          groups={navigationFor(user.role)}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      </div>

      {isOwner && (
        <div className="px-3 pb-3">
          <GettingStartedLink
            isSetupOpen={isSetupOpen}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        </div>
      )}

      <div className="border-t border-sidebar-border p-3">
        <UserMenu />
      </div>
    </>
  );
};

interface SidebarProps {
  user: User;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const [menuOpenedOn, setMenuOpenedOn] = useState<string | null>(null);
  const isMenuOpen = menuOpenedOn === pathname;
  const closeMenu = () => setMenuOpenedOn(null);

  useEffect(() => {
    if (!isMenuOpen) return;

    const desktop = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpenedOn(null);
    };

    desktop.addEventListener("change", closeOnDesktop);

    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [isMenuOpen]);

  return (
    <>
      <Dialog
        open={isMenuOpen}
        onOpenChange={(open) => setMenuOpenedOn(open ? pathname : null)}
      >
        <header className="sticky top-0 z-40 border-b border-sidebar-border bg-sidebar text-sidebar-foreground md:hidden">
          <div className="flex h-16 items-center justify-between px-4">
            <Logo />

            <DialogTrigger
              aria-label="Open menu"
              className="rounded-lg p-2 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
            >
              <Menu className="size-5" aria-hidden="true" />
            </DialogTrigger>
          </div>
        </header>

        <DialogSidePanel className="bg-sidebar text-sidebar-foreground md:hidden">
          <DialogTitle className="sr-only">Menu</DialogTitle>

          <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
            <Logo />

            <DialogClose render={<CloseButton aria-label="Close menu" />} />
          </div>

          <SidebarBody user={user} pathname={pathname} onNavigate={closeMenu} />
        </DialogSidePanel>
      </Dialog>

      {/* Desktop */}

      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">
          <Logo />
        </div>

        <SidebarBody user={user} pathname={pathname} />
      </aside>
    </>
  );
}
