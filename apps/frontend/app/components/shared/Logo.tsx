"use client";

// import Image from "next/image";
import Link from "next/link";
// import { cn } from "@/lib/utils/cn";

// type LogoProps = {
//   isAdmin?: boolean;
//   href?: string;
//   title?: string;
//   size?: "sm" | "md";
//   className?: string;
// };

// export function Logo({
//   isAdmin = false,
//   href = "/",
//   title = "WorkTrack",
//   size = "md",
//   className,
// }: LogoProps) {
//   const subtitle = isAdmin ? "Administration" : "";
//   console.log(isAdmin);

//   const content = (
//     <div className={cn("flex items-center gap-3", className)}>
//       <Image
//         src="/images/worktrack-logo.webp"
//         alt="WorkTrack"
//         width={40}
//         height={40}
//         priority
//         className={cn("w-auto", size === "sm" ? "h-8" : "h-9")}
//       />

//       <div className="min-w-0">
//         <h2 className="truncate font-semibold text-zinc-900">{title}</h2>

//         <p className="text-xs text-zinc-500">{subtitle}</p>
//       </div>
//     </div>
//   );

//   return <Link href={href}>{content}</Link>;
// }

export const Logo = () => (
  <Link href="/" className="relative z-10 flex items-center gap-3 w-fit group">
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 font-bold text-white shadow-lg shadow-blue-500/25 transition-transform group-hover:scale-105">
      W
    </div>
    <span className="text-xl font-semibold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
      Worktrack
    </span>
  </Link>
);
