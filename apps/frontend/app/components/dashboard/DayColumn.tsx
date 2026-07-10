import { Timelog } from "@/types";
import { DAILY_TARGET_MINUTES } from "@/lib/consts";
import { getProjectColor } from "@/lib/projectColors";

type Props = {
  date: Date;
  timelogs: Timelog[];
  onAddClick: (date: Date) => void;
  onEntryClick: (timelog: Timelog) => void;
};

export const DayColumn = ({
  date,
  timelogs,
  onAddClick,
  onEntryClick,
}: Props) => {
  const totalMinutes = timelogs.reduce((sum, t) => sum + t.time, 0);

  const filledPct = Math.min(100, (totalMinutes / DAILY_TARGET_MINUTES) * 100);

  const weekend = date.getDay() === 0 || date.getDay() === 6;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onAddClick(date)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onAddClick(date);
        }
      }}
      className={`
        relative
        h-full
        border-r
        border-zinc-200
        last:border-r-0
        overflow-hidden
        cursor-pointer
        transition-colors

        ${
          weekend
            ? "bg-[repeating-linear-gradient(-45deg,#fafafa,#fafafa_8px,#f4f4f5_8px,#f4f4f5_16px)]"
            : "bg-white"
        }

        hover:bg-zinc-50
      `}
    >
      {timelogs.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] text-zinc-300">Click to log time</span>
        </div>
      )}

      <div
        className="absolute bottom-0 left-0 right-0 flex flex-col-reverse"
        style={{ height: `${filledPct}%` }}
      >
        {timelogs.map((log) => {
          const color = getProjectColor(log.projectActivity.project.id);

          return (
            <div
              key={log.id}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onEntryClick(log);
              }}
              style={{
                flex: `${log.time} 0 0%`,
                backgroundColor: color.bg,
              }}
              className="
                w-full
                min-h-[6px]
                border-b
                border-white/40
                hover:brightness-110
                transition-all
              "
            />
          );
        })}
      </div>
    </div>
  );
};
