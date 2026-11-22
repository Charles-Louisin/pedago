import fs from "node:fs";
import path from "node:path";

/**
 * APK Android proposé au téléchargement. Deux sources, dans l'ordre :
 * 1. APK_URL (lien direct vers l'APK construit par EAS, ou un autre hébergement), avec APK_VERSION / APK_SIZE_MB ;
 * 2. le fichier public/downloads/pedago.apk servi par ce site.
 * Sans APK, le bouton reste inactif et la page l'explique : aucun lien qui ne mène nulle part.
 */
export type Apk = { url: string; sizeMb: number | null; version: string | null; updatedAt: string | null };

export function getApk(): Apk | null {
  const external = process.env.APK_URL?.trim();
  if (external && /^https:\/\//.test(external)) {
    const size = Number(process.env.APK_SIZE_MB);
    return { url: external, sizeMb: Number.isFinite(size) && size > 0 ? size : null, version: process.env.APK_VERSION?.trim() || null, updatedAt: null };
  }
  const file = path.join(process.cwd(), "public", "downloads", "pedago.apk");
  if (!fs.existsSync(file)) return null;
  const st = fs.statSync(file);
  return { url: "/downloads/pedago.apk", sizeMb: Math.round((st.size / 1048576) * 10) / 10, version: process.env.APK_VERSION?.trim() || null, updatedAt: st.mtime.toISOString() };
}
