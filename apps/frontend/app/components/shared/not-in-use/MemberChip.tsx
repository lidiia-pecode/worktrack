// "use client";

// import { ReactNode } from "react";
// import { X } from "lucide-react";

// import { cn } from "@/lib/utils/cn";
// import { fullName } from "@/lib/utils/user";
// import { User } from "@/types";
// import { Avatar } from "./Avatar";

// interface EntityChipProps {
//   label: string;
//   icon?: ReactNode;
//   meta?: string;
//   onRemove?: () => void;
//   className?: string;
// }

// export function MemberChip({
//   label,
//   icon,
//   meta,
//   onRemove,
//   className,
// }: EntityChipProps) {
//   return (
//     <div
//       className={cn(
//         "flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-2 shadow-sm",
//         "transition-all hover:border-brand/30 hover:shadow",
//         className,
//       )}
//     >
//       {icon}

//       <span className="max-w-[180px] truncate text-sm font-medium text-foreground">
//         {label}
//         {meta && (
//           <span className="ml-1 text-xs font-normal text-muted-foreground">
//             · {meta}
//           </span>
//         )}
//       </span>

//       {onRemove && (
//         <button
//           type="button"
//           onClick={onRemove}
//           aria-label={`Remove ${label}`}
//           className={cn(
//             "rounded-full p-0.5 text-muted-foreground/60 transition-colors",
//             "hover:text-destructive",
//             "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
//           )}
//         >
//           <X size={13} />
//         </button>
//       )}
//     </div>
//   );
// }

// interface UserChipProps {
//   user: User;
//   meta?: string;
//   onRemove?: () => void;
//   className?: string;
// }

// /** Convenience wrapper around MemberChip for the common "user" case. */
// export function UserChip({ user, meta, onRemove, className }: UserChipProps) {
//   return (
//     <MemberChip
//       label={fullName(user)}
//       icon={<Avatar user={user} size="sm" />}
//       meta={meta}
//       onRemove={onRemove}
//       className={className}
//     />
//   );
// }
