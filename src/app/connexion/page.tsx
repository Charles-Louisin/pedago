"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { IntroGate } from "@/components/brand/IntroLoader";
import { PedagoWordmark } from "@/components/brand/PedagoMark";
import { TopographicFlow } from "@/components/ui/TopographicFlow";
import { BubbleButton, BubbleField } from "@/components/ui/Bubble";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Étape 2 : code de l'application d'authentification (ou code de secours).
  const [mfa, setMfa] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);
  const [code, setCode] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier, password }) });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setError(data.message ?? "Connexion impossible");
    if (data.mfaRequired) return setMfa(true);
    router.replace(data.mfaSetup ? "/securite" : "/");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const clean = code.trim();
    const res = await fetch("/api/session/mfa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(useRecovery ? { recoveryCode: clean } : { code: clean.replace(/\s/g, "") }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (data.expired) {
      setMfa(false);
      setCode("");
    }
    if (!res.ok) return setError(data.message ?? "Code incorrect");
    router.replace("/");
  }

  return (
    <IntroGate>
      <main className="relative grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
        <section className="relative hidden overflow-hidden border-r border-[var(--line)] lg:block">
          <div className="absolute inset-0 opacity-90">
            <TopographicFlow lines={16} speed={0.04} />
          </div>
          <div className="relative flex h-full flex-col justify-between p-12">
            <PedagoWordmark />
            <div className="max-w-md rise-in">
              <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">Atelier éditorial</p>
              <h1 className="text-[44px] font-semibold leading-[1.02]">
                Une bibliothèque
                <br />
                pédagogique fiable,
                <br />
                <span className="text-muted">pensée au Cameroun.</span>
              </h1>
              <p className="mt-5 text-[15px] leading-relaxed text-ink-2">
                Sources officielles, génération assistée, contrôle indépendant et validation humaine avant chaque publication.
              </p>
            </div>
            <p className="text-[12px] text-muted">Réservé aux relecteurs et administrateurs.</p>
          </div>
        </section>

        <section className="flex items-center justify-center p-6">
          {mfa ? (
            <form onSubmit={verify} className="w-full max-w-[380px] rise-in">
              <div className="mb-10 lg:hidden">
                <PedagoWordmark />
              </div>
              <h2 className="text-[28px] font-semibold">{useRecovery ? "Code de secours" : "Code de vérification"}</h2>
              <p className="mb-8 mt-1.5 text-[14px] text-muted">{useRecovery ? "Un des 8 codes notés à l’activation." : "Ouvre ton application d’authentification."}</p>
              <BubbleField
                key={useRecovery ? "r" : "c"}
                label={useRecovery ? "Code de secours" : "Code à 6 chiffres"}
                inputMode={useRecovery ? "text" : "numeric"}
                autoComplete="one-time-code"
                autoFocus
                required
                maxLength={useRecovery ? 12 : 7}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={useRecovery ? "ABCD-EFGH" : "123 456"}
              />
              {error && <p className="mt-4 rounded-xl bg-red/10 px-4 py-2.5 text-[13px] text-red">{error}</p>}
              <BubbleButton tone="ink" size="lg" className="mt-8 w-full" disabled={loading}>
                {loading ? "Vérification…" : "Valider"} <ArrowRight size={18} />
              </BubbleButton>
              <button type="button" className="mt-4 w-full text-[13px] font-medium text-green" onClick={() => { setUseRecovery(!useRecovery); setCode(""); setError(null); }}>
                {useRecovery ? "Utiliser l’application" : "Téléphone perdu ? Code de secours"}
              </button>
            </form>
          ) : (
          <form onSubmit={submit} className="w-full max-w-[380px] rise-in" style={{ animationDelay: "120ms" }}>
            <div className="mb-10 lg:hidden">
              <PedagoWordmark />
            </div>
            <h2 className="text-[28px] font-semibold">Connexion</h2>
            <p className="mb-8 mt-1.5 text-[14px] text-muted">Accède à l’espace de relecture et de publication.</p>
            <div className="space-y-4">
              <BubbleField label="E-mail" type="email" autoComplete="username" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="nom@exemple.cm" />
              <BubbleField label="Mot de passe" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {error && <p className="mt-4 rounded-xl bg-red/10 px-4 py-2.5 text-[13px] text-red">{error}</p>}
            <BubbleButton tone="ink" size="lg" className="mt-8 w-full" disabled={loading}>
              {loading ? "Connexion…" : "Continuer"} <ArrowRight size={18} />
            </BubbleButton>
          </form>
          )}
        </section>
      </main>
    </IntroGate>
  );
}
