import { cn } from "../shared/utils";

type Props = React.SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, ...props }: Props) {
  return (
    <select
      className={cn(
        "focus-ring w-full rounded-xl border border-black/10 bg-[rgb(var(--card))] px-3 py-2 text-sm",
        className
      )}
      {...props}
    />
  );
}
