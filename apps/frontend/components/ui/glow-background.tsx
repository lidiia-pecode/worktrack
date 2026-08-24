import { cn } from "@/lib/utils/cn";

interface GlowBackgroundProps {
  className?: string;
  variant?: "auth";
  animated?: boolean;
}

const variantClasses = {
  auth: {
    silverTop:
      "absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-secondary/25 blur-[100px]",
    silverBottom:
      "absolute -bottom-48 -right-32 h-[560px] w-[560px] rounded-full bg-secondary/20 blur-[120px]",
    cyan: "absolute right-[-120px] top-[28%] h-[360px] w-[360px] rounded-full bg-brand/20 blur-[110px]",
  },
} as const;

export function GlowBackground({
  className,
  variant = "auth",
  animated = false,
}: GlowBackgroundProps) {
  const styles = variantClasses[variant];

  const animation = animated
    ? {
        silverTop: "animate-glow-slow",
        silverBottom: "animate-glow-slow-reverse",
        cyan: "animate-glow-pulse",
      }
    : {
        silverTop: "",
        silverBottom: "",
        cyan: "",
      };

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      {/* Silver — top left */}
      <div className={cn(styles.silverTop, animation.silverTop)} />

      {/* Silver — bottom right */}
      <div className={cn(styles.silverBottom, animation.silverBottom)} />

      {/* Pacific Cyan accent */}
      <div className={cn(styles.cyan, animation.cyan)} />
    </div>
  );
}
