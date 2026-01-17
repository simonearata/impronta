import { cn } from "../shared/utils";

type Props = { title: string; description?: string; className?: string };

export function EmptyState({ title, description, className }: Props) {
  return (
    <div className={cn("card-surface rounded-2xl p-8 text-center", className)}>
      <div className="font-serif text-2xl tracking-tighter2">{title}</div>
      {description ? (
        <div className="mt-2 text-sm text-neutral-700">{description}</div>
      ) : null}
    </div>
  );
}
