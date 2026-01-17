import { cn } from "../shared/utils";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: Props) {
  const base =
    "focus-ring rounded-full px-4 py-2 text-sm inline-flex items-center justify-center transition";
  const v =
    variant === "primary"
      ? "bg-neutral-900 text-[rgb(var(--bg))] hover:bg-neutral-800"
      : "border border-black/10 bg-black/5 hover:bg-black/10 text-neutral-900";

  return <button type={type} className={cn(base, v, className)} {...props} />;
}
