import useSWR from "swr";
import type { HomeContent } from "../shared/schemas";
import { HomeContentSchema } from "../shared/schemas";

const KEY = "impronta_home_content";

function ensure(): HomeContent {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    try {
      return HomeContentSchema.parse(JSON.parse(raw));
    } catch {
      localStorage.removeItem(KEY);
    }
  }

  const init: HomeContent = {
    heroImageUrl: null,
    heroQuote:
      "Un catalogo essenziale, fatto di luoghi, persone e vini che parlano piano.",
    story:
      "Impronta nasce per raccontare territori e produttori senza rumore. Ogni scheda è un appunto: una traccia di stile, materia e tempo.",
    vision:
      "Mettere in luce la differenza. Non la quantità, ma il gesto. Non l’etichetta, ma l’impronta lasciata nel bicchiere.",
    mission:
      "Curare una selezione editoriale, con testi chiari e un archivio navigabile. Una mappa semplice per orientarsi tra zone, aziende e referenze.",
    featuredZoneIds: [],
    featuredProducerIds: [],
    featuredWineIds: [],
  };

  localStorage.setItem(KEY, JSON.stringify(init));
  return init;
}

export async function getHomeContent(): Promise<HomeContent> {
  return ensure();
}

export async function updateHomeContent(
  input: HomeContent
): Promise<HomeContent> {
  const parsed = HomeContentSchema.parse(input);
  localStorage.setItem(KEY, JSON.stringify(parsed));
  return parsed;
}

export function useHomeContent() {
  return useSWR("home", () => getHomeContent(), { revalidateOnFocus: false });
}
