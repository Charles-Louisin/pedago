import { API_URL } from "./session";

/** Média du site public (film de présentation) : adresses UploadThing enregistrées en base par l'API. */
export type SiteMedia = {
  sources: { url: string; type: "video/webm" | "video/mp4"; height: number; maxWidth: number | null }[];
  poster: string;
  durationSec: number;
};

const UT = /^https:\/\/([a-z0-9-]+\.)?(ufs\.sh|utfs\.io)\//i;

/**
 * Lu côté serveur et gardé une heure en cache par Next (aucune requête en plus pour le visiteur).
 * Si l'API ne répond pas (3 s au plus), la page s'affiche sans le film plutôt que d'attendre.
 */
export async function getSiteMedia(key: string): Promise<SiteMedia | null> {
  try {
    const res = await fetch(`${API_URL}/public/site-media/${encodeURIComponent(key)}`, {
      next: { revalidate: 3600, tags: [`site-media:${key}`] },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const m = (await res.json()) as SiteMedia;
    // Seulement des fichiers UploadThing (ce que la politique de sécurité du site autorise).
    const sources = (m.sources ?? []).filter((s) => UT.test(s.url) && (s.type === "video/webm" || s.type === "video/mp4"));
    if (!sources.length || !UT.test(m.poster)) return null;
    return { sources, poster: m.poster, durationSec: Number(m.durationSec) || 60 };
  } catch {
    return null;
  }
}
