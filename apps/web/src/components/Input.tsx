import { forwardRef } from "react";
import { cn } from "../shared/utils";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        "focus-ring w-full rounded-xl border border-black/10 bg-[rgb(var(--card))] px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500",
        className
      )}
      {...props}
    />
  );
});
