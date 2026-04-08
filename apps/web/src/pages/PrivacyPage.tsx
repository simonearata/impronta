import { Container } from "../components/Container";
import { Meta } from "../components/Meta";

export function PrivacyPage() {
  return (
    <>
      <Meta
        title="Privacy Policy"
        path="/privacy"
        description="Informativa sulla privacy di Impronta Wine Dealer."
      />
      <section className="py-16">
        <Container className="max-w-3xl">
          <div className="text-xs text-neutral-600 tracking-wide">LEGALE</div>
          <h1 className="mt-2 font-serif text-4xl tracking-tighter2">
            Privacy Policy
          </h1>

          <div className="mt-10 card-surface rounded-2xl p-8 sm:p-10">
            <div className="grid gap-8 text-sm text-neutral-800 leading-relaxed">
              <div>
                <h2 className="font-serif text-xl tracking-tighter2">
                  TITOLARE DEL TRATTAMENTO
                </h2>
                <p className="mt-3">
                  Il titolare del trattamento dei dati è Impronta Wine Dealer,
                  con sede a Roma, Italia. Per qualsiasi richiesta relativa al
                  trattamento dei dati personali è possibile scrivere
                  all'indirizzo indicato nella pagina Contatti.
                </p>
              </div>

              <div>
                <h2 className="font-serif text-xl tracking-tighter2">
                  DATI RACCOLTI
                </h2>
                <p className="mt-3">
                  Il sito raccoglie esclusivamente i dati forniti
                  volontariamente dall'utente attraverso il modulo di contatto:
                  nome, email, telefono (opzionale), oggetto e messaggio. Questi
                  dati vengono utilizzati unicamente per rispondere alla
                  richiesta.
                </p>
              </div>

              <div>
                <h2 className="font-serif text-xl tracking-tighter2">
                  COOKIE E TECNOLOGIE DI TRACCIAMENTO
                </h2>
                <p className="mt-3">
                  Questo sito utilizza esclusivamente cookie tecnici e
                  localStorage strettamente necessari al funzionamento, in
                  particolare per la gestione della sessione di autenticazione
                  dell'area amministrativa. Non vengono utilizzati cookie di
                  profilazione, analytics, o di terze parti. Nessun dato viene
                  condiviso con servizi esterni.
                </p>
              </div>

              <div>
                <h2 className="font-serif text-xl tracking-tighter2">
                  BASE GIURIDICA
                </h2>
                <p className="mt-3">
                  Il trattamento dei dati forniti tramite il modulo di contatto
                  si basa sul consenso dell'interessato (art. 6, par. 1, lett. a
                  del GDPR). L'utilizzo di cookie tecnici si basa sul legittimo
                  interesse del titolare a garantire il corretto funzionamento
                  del sito (art. 6, par. 1, lett. f del GDPR) e non richiede
                  consenso preventivo ai sensi dell'art. 122 del D.Lgs.
                  196/2003.
                </p>
              </div>

              <div>
                <h2 className="font-serif text-xl tracking-tighter2">
                  CONSERVAZIONE
                </h2>
                <p className="mt-3">
                  I dati del modulo di contatto vengono conservati per il tempo
                  necessario a gestire la richiesta e successivamente
                  cancellati. I cookie tecnici durano per la sessione o fino
                  alla chiusura del browser.
                </p>
              </div>

              <div>
                <h2 className="font-serif text-xl tracking-tighter2">
                  DIRITTI DELL'INTERESSATO
                </h2>
                <p className="mt-3">
                  In qualsiasi momento è possibile esercitare i diritti previsti
                  dagli artt. 15-22 del GDPR (accesso, rettifica, cancellazione,
                  limitazione, portabilità, opposizione) scrivendo all'indirizzo
                  indicato nella pagina Contatti. È inoltre possibile proporre
                  reclamo all'Autorità Garante per la protezione dei dati
                  personali (www.garanteprivacy.it).
                </p>
              </div>

              <div
                className="text-xs text-neutral-600 pt-4"
                style={{ borderTop: "1px solid rgba(228, 213, 183, 0.5)" }}
              >
                Ultimo aggiornamento: Marzo 2026
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
