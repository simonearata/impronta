import { cn } from "../shared/utils";

type Props = { className?: string };

export function Skeleton({ className }: Props) {
  return (
    <div className={cn("animate-pulse rounded-xl bg-black/10", className)} />
  );
}
