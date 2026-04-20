import { useEffect, useRef, useState } from "react";
import React from "react";
import { cn } from "../shared/utils";

type Props = React.SelectHTMLAttributes<HTMLSelectElement>;

function parseOptions(children: React.ReactNode): { value: string; label: string }[] {
  const result: { value: string; label: string }[] = [];
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === "option") {
      const p = child.props as { value?: string; children?: React.ReactNode };
      result.push({ value: String(p.value ?? ""), label: String(p.children ?? "") });
    }
  });
  return result;
}

export function Select({ className, value, onChange, disabled, children, ...props }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const options = parseOptions(children);
  const selected = options.find((o) => o.value === String(value ?? ""));

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function select(val: string) {
    onChange?.({ target: { value: val } } as React.ChangeEvent<HTMLSelectElement>);
    setOpen(false);
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className="focus-ring w-full flex items-center justify-between gap-2 rounded-xl border border-black/10 bg-[rgb(var(--card))] px-3 py-2.5 text-sm text-neutral-900 text-left transition hover:border-black/20 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-haspopup="listbox"
        aria-expanded={open}
        {...(props as any)}
      >
        <span className="truncate">{selected?.label ?? ""}</span>
        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          className={cn("shrink-0 text-neutral-400 transition-transform duration-150", open && "rotate-180")}
          aria-hidden="true"
        >
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-max rounded-xl border border-black/10 bg-[rgb(var(--card))] shadow-lg overflow-hidden">
          <ul role="listbox" className="py-1 max-h-64 overflow-y-auto">
            {options.map((opt) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={opt.value === String(value ?? "")}
                onMouseDown={() => select(opt.value)}
                className={cn(
                  "px-3 py-2 text-sm cursor-pointer transition-colors",
                  opt.value === String(value ?? "")
                    ? "bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))] font-medium"
                    : "text-neutral-800 hover:bg-black/[0.04]",
                )}
              >
                {opt.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
