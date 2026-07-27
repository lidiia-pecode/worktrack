import { formatDuration } from "@/lib/date";
import { formatWeekdayLabel, isToday } from "@/lib/week";

type WeekHeaderDayProps = {
  date: Date;
  totalMinutes: number;
  targetMinutes: number;
};

export function WeekHeaderDay({
  date,
  totalMinutes,
  targetMinutes,
}: WeekHeaderDayProps) {
  const today = isToday(date);
  const weekend = date.getDay() === 0 || date.getDay() === 6;
  const isOverTarget = totalMinutes > targetMinutes;

  return (
    <div
      className={`
        p-2 flex flex-col md:flex-row gap-2 justify-between
        border-r border-zinc-100 last:border-r-0
        ${weekend ? "bg-zinc-50" : ""}
      `}
    >
      <div className="flex gap-2 items-baseline">
        <p className="text-[10px] uppercase tracking-wider text-zinc-400">
          {formatWeekdayLabel(date)}
        </p>

        <p
          className={`
            text-xs font-semibold
            ${today ? "text-blue-600" : "text-zinc-700"}
          `}
        >
          {date.getDate()}
        </p>
      </div>

      <p
        className={`
          text-xs font-medium
          ${isOverTarget ? "text-amber-600" : "text-zinc-400"}
        `}
      >
        {totalMinutes > 0 ? formatDuration(totalMinutes) : "-"}
      </p>
    </div>
  );
}
