import { cn } from "@/lib/utils/cn";

interface GlowBackgroundProps {
  className?: string;
}

/**
 * The light of the dark pages before sign-in, the auth panel and the
 * landing's hero: two pale teal pools in opposite corners and one of the
 * brand on the right. The parent provides the dark ground and clips it.
 */
export const GlowBackground = ({ className }: GlowBackgroundProps) => (
  <div
    aria-hidden="true"
    className={cn(
      "pointer-events-none absolute inset-0 overflow-hidden",
      className,
    )}
  >
    <div className="absolute -top-40 -left-40 size-130 rounded-full bg-brand-mist/25 blur-[100px]" />
    <div className="absolute -right-32 -bottom-48 size-140 rounded-full bg-brand-mist/20 blur-[120px]" />
    <div className="absolute top-[28%] -right-30 size-90 rounded-full bg-brand/20 blur-[110px]" />
  </div>
);
