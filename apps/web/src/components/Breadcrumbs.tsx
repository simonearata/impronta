import { Link } from "react-router-dom";

type Item = { label: string; to?: string };

export function Breadcrumbs({ items }: { items: Item[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-neutral-600">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((it, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={`${it.label}-${idx}`} className="flex items-center gap-2">
              {it.to && !isLast ? (
                <Link
                  className="focus-ring rounded hover:text-neutral-900"
                  to={it.to}
                >
                  {it.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined}>
                  {it.label}
                </span>
              )}
              {!isLast ? <span className="opacity-50">/</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
