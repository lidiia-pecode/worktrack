import { cn } from "@/lib/utils/cn";

interface GlowBackgroundProps {
  className?: string;
  intensity?: "subtle" | "default" | "strong";
}

const intensityClasses = {
  subtle: {
    blue: "bg-blue-600/10",
    indigo: "bg-indigo-600/7",
  },
  default: {
    blue: "bg-blue-600/15",
    indigo: "bg-indigo-600/10",
  },
  strong: {
    blue: "bg-blue-600/20",
    indigo: "bg-indigo-600/15",
  },
};

export function GlowBackground({
  className,
  intensity = "default",
}: GlowBackgroundProps) {
  const colors = intensityClasses[intensity];

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      {/* Top-left glow */}
      <div
        className={cn(
          "absolute -left-32 -top-32 h-[500px] w-[500px]",
          "rounded-full blur-[120px]",
          colors.blue,
          "animate-glow-slow",
        )}
      />

      {/* Bottom-right glow */}
      <div
        className={cn(
          "absolute -bottom-32 -right-32 h-[450px] w-[450px]",
          "rounded-full blur-[110px]",
          colors.indigo,
          "animate-glow-slow-reverse",
        )}
      />

      {/* Center ambient glow */}
      <div
        className={cn(
          "absolute left-1/2 top-1/3",
          "h-[300px] w-[500px] -translate-x-1/2",
          "rounded-full blur-[140px]",
          "bg-blue-600/5",
          "animate-glow-pulse",
        )}
      />
    </div>
  );
}
