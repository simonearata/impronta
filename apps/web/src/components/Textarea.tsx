import { forwardRef } from "react";
import { cn } from "../shared/utils";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "focus-ring w-full rounded-xl border border-black/10 bg-[rgb(var(--card))] px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500",
          className
        )}
        {...props}
      />
    );
  }
);
