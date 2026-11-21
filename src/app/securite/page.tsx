"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Copy, ShieldCheck } from "lucide-react";
import { PedagoWordmark } from "@/components/brand/PedagoMark";
import { BubbleButton, BubbleField } from "@/components/ui/Bubble";

type Setup = { secret: string; otpauthUrl: string };

/** Activation obligatoire de la double authentification pour l'équipe éditoriale. */
export default function SecurityPage() {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      const res = await fetch("/api/mfa/setup", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) return void (window.location.href = "/connexion");
      if (res.status === 409) return void (window.location.href = "/");
      if (!res.ok) return setError(data.message ?? "Activation impossible");
      setSetup(data);
      setQr(await QRCode.toDataURL(data.otpauthUrl, { margin: 1, width: 220, color: { dark: "#1D2420", light: "#FFFFFF" } }));
    })();
  }, []);

  async function enable(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/mfa/enable", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: code.replace(/\s/g, "") }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.message ?? "Code incorrect");
    setRecovery(data.recoveryCodes);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-[440px]">
        <div className="mb-10">
          <PedagoWordmark />
        </div>

        {recovery ? (
          <section>
            <div className="flex items-center gap-2 text-green">
              <ShieldCheck size={22} />
              <h1 className="text-[24px] font-semibold text-ink">Double authentification active</h1>
            </div>
            <p className="mt-2 text-[14px] text-muted">Codes de secours, à usage unique. Garde-les hors de ce téléphone.</p>
            <ul className="mt-6 grid grid-cols-2 gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 font-mono text-[15px] tracking-wider">
              {recovery.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <div className="mt-6 flex gap-3">
              <BubbleButton
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(recovery.join("\n"));
                  setCopied(true);
                }}
              >
                <Copy size={16} /> {copied ? "Copiés" : "Copier"}
              </BubbleButton>
              <BubbleButton tone="ink" type="button" className="flex-1" onClick={() => (window.location.href = "/")}>
                J’ai noté mes codes
              </BubbleButton>
            </div>
          </section>
        ) : (
          <form onSubmit={enable}>
            <h1 className="text-[24px] font-semibold">Sécuriser ton compte</h1>
            <p className="mt-2 text-[14px] text-muted">Obligatoire pour l’équipe éditoriale.</p>
            <ol className="mt-8 space-y-6 text-[14px]">
              <li>
                <p className="font-medium">1. Scanne ce code avec ton application d’authentification</p>
                <p className="text-[13px] text-muted">Google Authenticator, Microsoft Authenticator, Aegis…</p>
                <div className="mt-3 flex items-start gap-4">
                  <div className="grid size-[148px] shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-white">
                    {/* QR généré sur place (data: URL) : rien à optimiser par next/image. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {qr ? <img src={qr} alt="QR code de configuration" width={140} height={140} /> : <span className="text-[12px] text-muted">…</span>}
                  </div>
                  {setup && (
                    <div className="min-w-0 text-[12px] text-muted">
                      Ou saisis la clé :
                      <code className="mt-1 block break-all rounded-lg bg-[var(--surface)] px-2 py-1.5 font-mono text-[12.5px] text-ink">{setup.secret.replace(/(.{4})/g, "$1 ").trim()}</code>
                    </div>
                  )}
                </div>
              </li>
              <li>
                <p className="mb-2 font-medium">2. Saisis le code à 6 chiffres affiché</p>
                <BubbleField inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required value={code} onChange={(e) => setCode(e.target.value)} placeholder="123 456" />
              </li>
            </ol>
            {error && <p className="mt-4 rounded-xl bg-red/10 px-4 py-2.5 text-[13px] text-red">{error}</p>}
            <BubbleButton tone="ink" size="lg" className="mt-8 w-full" disabled={busy || !setup}>
              {busy ? "Vérification…" : "Activer"}
            </BubbleButton>
          </form>
        )}
      </div>
    </main>
  );
}
