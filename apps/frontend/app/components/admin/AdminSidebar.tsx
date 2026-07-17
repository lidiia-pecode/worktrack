"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  FolderKanban,
  Activity,
  FolderTree,
  LogOut,
  Settings,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { CloseButton } from "../ui/Button";
import { AdminUserMenu } from "./AdminUserMenu";

const navigation = [
  {
    label: "Projects",
    href: "/admin/projects",
    icon: FolderKanban,
  },
  {
    label: "Activities",
    href: "/admin/activities",
    icon: Activity,
  },
  {
    label: "Categories",
    href: "/admin/categories",
    icon: FolderTree,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* ================= MOBILE ================= */}

      <header className="sticky top-0 z-40 md:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img
              src="/images/worktrack-logo.webp"
              alt="WorkTrack"
              className="h-8 w-auto"
            />

            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Administration
              </h2>

              <p className="text-xs text-gray-500">Management</p>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(true)}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* Mobile Overlay */}

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 md:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-xl md:hidden">
            {/* Header */}

            <div className="flex h-16 items-center justify-between border-b border-gray-100 px-4">
              <div className="flex items-center gap-3">
                <img
                  src="/images/worktrack-logo.webp"
                  alt="WorkTrack"
                  className="h-8 w-auto"
                />

                <div>
                  <h2 className="font-semibold text-gray-900">WorkTrack</h2>

                  <p className="text-xs text-gray-500">Administration</p>
                </div>
              </div>
              <CloseButton onClick={() => setIsOpen(false)} />
            </div>

            {/* Navigation */}

            <div className="p-4">
              <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Management
              </p>

              <nav className="space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={clsx(
                        "group flex items-center justify-between rounded-xl px-3 py-3 transition-all",
                        isActive
                          ? "bg-gray-900 text-white"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={18} />

                        <span className="font-medium">{item.label}</span>
                      </div>

                      <ChevronRight size={16} />
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Bottom */}

            <div className="absolute bottom-0 left-0 right-0 border-t border-gray-100 p-4">
              <AdminUserMenu />
            </div>
          </div>
        </>
      )}

      {/* ================= DESKTOP ================= */}

      <aside className="hidden h-screen w-72 flex-col border-r border-gray-200 bg-white md:flex">
        <div className="border-b border-gray-100 px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/images/worktrack-logo.webp"
              alt="WorkTrack"
              className="h-9 w-auto"
            />

            <div>
              <h2 className="font-semibold text-gray-900">WorkTrack</h2>

              <p className="text-xs text-gray-500">Administration</p>
            </div>
          </Link>
        </div>

        <div className="flex-1 p-4">
          <div className="mb-3 px-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Management
            </span>
          </div>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "group flex items-center justify-between rounded-xl px-3 py-3 transition-all",
                    isActive
                      ? "bg-gray-900 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} />

                    <span className="font-medium">{item.label}</span>
                  </div>

                  <ChevronRight
                    size={16}
                    className={clsx(
                      isActive
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-50",
                    )}
                  />
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto border-t border-gray-100 p-4">
          <AdminUserMenu />
        </div>
      </aside>
    </>
  );
}
