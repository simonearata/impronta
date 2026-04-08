import { useEffect, useState } from "react";

/*
  CookieBanner — Banner informativo cookie tecnici (GDPR / ePrivacy)

  COME FUNZIONA:
  - Al primo caricamento del sito, controlla localStorage per "impronta_cookie_ok"
  - Se NON esiste → mostra il banner in basso
  - L'utente clicca "Ok, ho capito" → salva "impronta_cookie_ok" = "1" in localStorage
  - Dalla volta successiva il banner non si mostra più

  PERCHÉ SERVE:
  La normativa europea (GDPR + Direttiva ePrivacy 2002/58/CE, recepita in Italia
  dal D.Lgs. 196/2003 e dal provvedimento del Garante Privacy del 10/06/2021)
  richiede che l'utente sia INFORMATO dell'uso di cookie/storage.

  I cookie/localStorage "tecnici" (come il token di sessione admin) NON richiedono
  consenso esplicito — serve solo informare. Quindi niente toggle accetta/rifiuta,
  basta un messaggio + link alla privacy policy + bottone "Ok".

  Se in futuro aggiungi Google Analytics, Facebook Pixel, o qualsiasi tracciamento
  di terze parti, allora DEVI aggiungere il meccanismo di consenso granulare
  (accetta/rifiuta per categoria) PRIMA di caricare quei script.
*/

const STORAGE_KEY = "impronta_cookie_ok";

export function CookieBanner() {
  // Stato: null = non ancora controllato, true = accettato, false = da mostrare
  const [accepted, setAccepted] = useState<boolean | null>(null);

  // Al mount, controlla se l'utente ha già accettato
  useEffect(() => {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      setAccepted(value === "1");
    } catch {
      // localStorage non disponibile (es. navigazione privata su vecchi browser)
      setAccepted(true); // non mostrare il banner se non possiamo salvare
    }
  }, []);

  // Funzione chiamata quando l'utente clicca "Ok"
  function handleAccept() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignora errori localStorage
    }
    setAccepted(true);
  }

  // Non mostrare nulla finché non abbiamo controllato, o se già accettato
  if (accepted === null || accepted === true) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] p-4"
      role="dialog"
      aria-label="Informativa cookie"
    >
      <div
        className="mx-auto max-w-3xl rounded-2xl border bg-[rgb(var(--card))] p-5 sm:p-6"
        style={{
          borderColor: "rgba(228, 213, 183, 0.8)",
          boxShadow: "0 -4px 24px rgba(0, 0, 0, 0.08)",
        }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div
            className="text-sm leading-relaxed"
            style={{ fontFamily: '"Courier New", Courier, monospace' }}
          >
            <p>
              Questo sito usa esclusivamente cookie tecnici necessari al
              funzionamento. Nessun dato viene condiviso con terze parti.
            </p>
            <p className="mt-1 text-xs" style={{ color: "rgb(var(--muted))" }}>
              Per saperne di più consulta la{" "}
              <a
                href="/privacy"
                className="underline"
                style={{ color: "rgb(var(--accent))" }}
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
          <button
            onClick={handleAccept}
            className="shrink-0 rounded-full px-5 py-2 text-sm font-bold uppercase tracking-wider transition"
            style={{
              fontFamily: '"Courier New", Courier, monospace',
              backgroundColor: "#000",
              color: "rgb(228, 213, 183)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgb(88, 139, 139)";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#000";
              e.currentTarget.style.color = "rgb(228, 213, 183)";
            }}
          >
            Ok, ho capito
          </button>
        </div>
      </div>
    </div>
  );
}
