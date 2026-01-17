import { Helmet } from "react-helmet-async";
import { absoluteUrl } from "../shared/utils";

type Props = { title: string; description?: string; path?: string };

export function Meta({ title, description, path }: Props) {
  const fullTitle = title.includes("Impronta") ? title : `${title} — Impronta`;
  const desc =
    description || "Catalogo editoriale di zone, aziende agricole e vini.";
  const url = absoluteUrl(path || "/");

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <link rel="canonical" href={url} />
    </Helmet>
  );
}
