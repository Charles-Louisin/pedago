import { Download, ShieldCheck } from "lucide-react";
import type { Apk } from "@/lib/server/apk";

/** Carte de téléchargement de l'APK : bouton réel (ou inactif et expliqué), QR code pour le téléphone. */
export function DownloadCard({ apk, qr }: { apk: Apk | null; qr: string | null }) {
  return (
    <div className="relative overflow-hidden rounded-[32px] bg-[#F7F5F1] p-6 sm:p-8">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-[#171717] sm:text-[30px]">PEDAGO pour Android</h3>
          <p className="mt-2 text-[14.5px] leading-relaxed text-[#5c5c5c]">
            {apk ? (
              <>
                Fichier APK{apk.version ? ` · version ${apk.version}` : ""}
                {apk.sizeMb ? ` · ${apk.sizeMb} Mo` : ""} · Android 7 ou plus récent.
              </>
            ) : (
              <>La version Android est en cours de préparation : le bouton s’activera dès que le fichier sera publié.</>
            )}
          </p>
          {apk ? (
            <a
              href={apk.url}
              download="PEDAGO.apk"
              className="mt-6 inline-flex h-14 items-center gap-3 rounded-[16px] bg-[#1A8A4C] px-7 text-[16px] font-semibold text-white shadow-[0_10px_30px_-10px_rgba(23,23,23,.6)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Download size={19} /> Télécharger l’APK
            </a>
          ) : (
            <button type="button" disabled aria-disabled className="mt-6 inline-flex h-14 cursor-not-allowed items-center gap-3 rounded-[16px] bg-[#151515]/20 px-7 text-[16px] font-semibold text-white">
              <Download size={19} /> APK bientôt disponible
            </button>
          )}
          <p className="mt-4 flex items-center gap-2 text-[12.5px] text-[#5c5c5c]">
            <ShieldCheck size={15} className="text-[#1A8A4C]" /> Signé par PEDAGO, sans publicité.
          </p>
        </div>
        {apk && qr && (
          <div className="flex shrink-0 flex-col items-center gap-2 self-center rounded-[24px] bg-white p-4 shadow-[0_20px_50px_-24px_rgba(0,0,0,.35)]">
            {/* QR généré sur place (data: URL) : aucun service tiers. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR code du téléchargement de l’APK" width={148} height={148} />
            <span className="text-[12px] text-[#5c5c5c]">Scanne avec ton téléphone</span>
          </div>
        )}
      </div>
    </div>
  );
}
