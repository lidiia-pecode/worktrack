// import { ReactNode } from "react";

// import { fullName } from "@/lib/utils/user";
// import { Avatar } from "./Avatar";

// interface MemberListUser {
//   firstName: string;
//   lastName: string;
//   email?: string | null;
//   avatarUrl?: string | null;
// }

// interface MemberListItem {
//   id: string;
//   user: MemberListUser;
// }

// interface MemberListProps<T extends MemberListItem> {
//   items: T[];
//   renderTrailing?: (item: T) => ReactNode;
//   emptyMessage?: string;
// }

// export function MemberList<T extends MemberListItem>({
//   items,
//   renderTrailing,
//   emptyMessage = "No members yet.",
// }: MemberListProps<T>) {
//   if (items.length === 0) {
//     return (
//       <p className="py-6 text-center text-sm text-muted-foreground">
//         {emptyMessage}
//       </p>
//     );
//   }

//   return (
//     <ul className="divide-y divide-border">
//       {items.map((item) => (
//         <li key={item.id} className="flex items-center gap-3 py-3">
//           <Avatar user={item.user} size="md" />

//           <div className="min-w-0 flex-1">
//             <p className="truncate text-sm font-medium text-foreground">
//               {fullName(item.user)}
//             </p>

//             {item.user.email && (
//               <p className="truncate text-xs text-muted-foreground">
//                 {item.user.email}
//               </p>
//             )}
//           </div>

//           {renderTrailing && (
//             <div className="flex shrink-0 items-center gap-2">
//               {renderTrailing(item)}
//             </div>
//           )}
//         </li>
//       ))}
//     </ul>
//   );
// }
