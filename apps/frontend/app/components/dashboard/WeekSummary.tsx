// import { formatDuration } from "@/lib/date";
// import { WEEKLY_TARGET_MINUTES } from "@/lib/consts";

// type Props = {
//   totalMinutes: number;
// };

// export const WeekSummary = ({ totalMinutes }: Props) => {
//   const remaining = WEEKLY_TARGET_MINUTES - totalMinutes;
//   const pct = Math.min(
//     100,
//     Math.round((totalMinutes / WEEKLY_TARGET_MINUTES) * 100),
//   );

//   return (
//     <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3">
//       <div className="flex items-center gap-6">
//         <div>
//           <p className="text-[11px] text-zinc-400">Logged</p>
//           <p className="text-sm font-medium text-zinc-900">
//             {formatDuration(totalMinutes)}
//           </p>
//         </div>

//         <div>
//           <p className="text-[11px] text-zinc-400">
//             {remaining >= 0 ? "Remaining" : "Over"}
//           </p>
//           <p
//             className={`text-sm font-medium ${
//               remaining >= 0 ? "text-zinc-900" : "text-amber-600"
//             }`}
//           >
//             {formatDuration(Math.abs(remaining))}
//           </p>
//         </div>
//       </div>

//       <div className="hidden sm:flex items-center gap-3 min-w-40">
//         <div className="flex-1 h-1 rounded-full bg-zinc-100 overflow-hidden">
//           <div
//             className={`h-full rounded-full transition-all ${
//               remaining >= 0 ? "bg-zinc-900" : "bg-amber-500"
//             }`}
//             style={{ width: `${pct}%` }}
//           />
//         </div>

//         <span className="text-[11px] text-zinc-500 whitespace-nowrap">
//           {pct}%
//         </span>
//       </div>
//     </div>
//   );
// };
