import { headers } from "next/headers";
import QRCode from "qrcode";
import type { Apk } from "./apk";

/** QR code (data: URL) menant à l'APK, avec l'adresse absolue du site tel qu'on le consulte. */
export async function apkQr(apk: Apk | null) {
  if (!apk) return null;
  let url = apk.url;
  if (url.startsWith("/")) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (!host) return null;
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    url = `${proto}://${host}${url}`;
  }
  return QRCode.toDataURL(url, { margin: 1, width: 296, color: { dark: "#171717", light: "#ffffff" } });
}
