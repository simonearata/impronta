import { useEffect, useRef } from "react";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Elimina",
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative card-surface rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h2
          id="confirm-title"
          className="font-serif text-xl tracking-tighter2"
        >
          {title}
        </h2>
        <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
          {message}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={cancelRef}
            className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5 hover:bg-black/10"
            onClick={onCancel}
          >
            Annulla
          </button>
          <button
            className="focus-ring rounded-full px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 border border-red-700"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
