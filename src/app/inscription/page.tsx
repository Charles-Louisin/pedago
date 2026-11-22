"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Circle } from "lucide-react";
import { PedagoWordmark } from "@/components/brand/PedagoMark";
import { TopographicFlow } from "@/components/ui/TopographicFlow";
import { BubbleButton, BubbleField } from "@/components/ui/Bubble";

type Field = "fullName" | "email" | "password" | "confirm";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Règle cochée en direct pendant la saisie. */
function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${ok ? "text-ink" : "text-muted"}`}>
      {ok ? <Check size={14} /> : <Circle size={12} />} {children}
    </span>
  );
}

/**
 * Inscription : un compte utilisateur (enseignant) par défaut — aucun rôle n'est demandé ; seul un
 * administrateur peut en attribuer un. Erreurs en direct : à la sortie du champ, puis à chaque frappe.
 * Étape 2 : le code à 6 chiffres reçu par e-mail confirme l'adresse.
 */
function SignUp() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<"form" | "code">(params.get("etape") === "code" ? "code" : "form");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const errors: Record<Field, string | undefined> = {
    fullName: fullName.trim().length < 2 ? "Indique ton nom complet" : undefined,
    email: !email.trim() ? "Adresse e-mail requise" : !EMAIL.test(email.trim()) ? "Adresse e-mail invalide" : undefined,
    password: password.length < 8 ? "8 caractères minimum" : undefined,
    confirm: confirm !== password ? "Les deux mots de passe ne correspondent pas" : undefined,
  };
  // La confirmation est comparée dès qu'elle est aussi longue que le mot de passe.
  const live: Partial<Record<Field, boolean>> = { confirm: confirm.length > 0 && confirm.length >= password.length };
  const show = (k: Field) => (submitted || touched[k] || live[k] ? errors[k] : undefined);
  const blur = (k: Field) => () => setTouched((t) => ({ ...t, [k]: true }));
  const edit = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    set(e.target.value);
    setError(null);
  };

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/inscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: fullName.trim(), email: email.trim().toLowerCase(), password, passwordConfirm: confirm }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setError(data.message ?? "Inscription impossible");
    setDevCode(data.devCode ?? null);
    setInfo(data.mailSent ? `Code envoyé à ${email.trim().toLowerCase()}.` : null);
    if (!data.mailSent) setError("Le code n’a pas pu être envoyé. Vérifie ton adresse puis touche « Renvoyer le code ».");
    setWait(45);
    setStep("code");
    setTimeout(() => codeRef.current?.focus(), 50);
  }

  async function verify(value = code) {
    const clean = value.replace(/\D/g, "");
    if (clean.length !== 6) return setError("Le code a 6 chiffres");
    setLoading(true);
    setError(null);
    const res = await fetch("/api/verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: clean }) });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.status === 401) return router.replace("/connexion");
    if (!res.ok) {
      setCode("");
      return setError(data.message ?? "Code incorrect");
    }
    router.replace("/compte");
  }

  async function resend() {
    setError(null);
    const res = await fetch("/api/verification/renvoyer", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) return router.replace("/connexion");
    if (!res.ok) return setError(data.message ?? "Envoi impossible");
    setDevCode(data.devCode ?? null);
    setInfo("Nouveau code envoyé.");
    setWait(45);
  }

  return (
    <main className="relative grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden border-r border-[var(--line)] lg:block">
        <div className="absolute inset-0 opacity-90">
          <TopographicFlow lines={16} speed={0.04} />
        </div>
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/" aria-label="Accueil PEDAGO">
            <PedagoWordmark />
          </Link>
          <div className="max-w-md rise-in">
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">Gratuit pour les enseignants</p>
            <h1 className="text-[44px] font-semibold leading-[1.02]">
              Un compte,
              <br />
              <span className="text-muted">sur le web et dans l’app.</span>
            </h1>
            <p className="mt-5 text-[15px] leading-relaxed text-ink-2">Crée ton compte ici, télécharge l’app Android, et connecte-toi avec le même e-mail et le même mot de passe.</p>
          </div>
          <p className="text-[12px] text-muted">Tes données restent les tiennes : export et suppression à tout moment.</p>
        </div>
      </section>

      <section className="flex items-center justify-center p-6">
        {step === "code" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void verify();
            }}
            noValidate
            className="w-full max-w-[380px] rise-in"
          >
            <div className="mb-10 lg:hidden">
              <Link href="/" aria-label="Accueil PEDAGO" className="inline-flex">
                <PedagoWordmark />
              </Link>
            </div>
            <h2 className="text-[28px] font-semibold">Vérifie ton e-mail</h2>
            <p className="mb-8 mt-1.5 text-[14px] text-muted">Saisis le code à 6 chiffres reçu par e-mail.</p>
            <BubbleField
              label="Code à 6 chiffres"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              value={code}
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d ]/g, "");
                setCode(v);
                setError(null);
                if (v.replace(/\D/g, "").length === 6) void verify(v);
              }}
              placeholder="123 456"
              error={error ?? undefined}
              hint={info ?? undefined}
            />
            {devCode && <p className="mt-2 text-[12.5px] text-muted">Développement : code {devCode}</p>}
            <BubbleButton tone="ink" size="lg" className="mt-8 w-full" disabled={loading}>
              {loading ? "Vérification…" : "Valider"} <ArrowRight size={18} />
            </BubbleButton>
            <button type="button" disabled={wait > 0} onClick={() => void resend()} className="mt-4 w-full text-[13.5px] font-medium text-ink disabled:text-muted">
              {wait > 0 ? `Renvoyer le code dans ${wait} s` : "Renvoyer le code"}
            </button>
          </form>
        ) : (
          <form onSubmit={register} noValidate className="w-full max-w-[400px] rise-in">
            <div className="mb-10 lg:hidden">
              <Link href="/" aria-label="Accueil PEDAGO">
                <PedagoWordmark />
              </Link>
            </div>
            <h2 className="text-[28px] font-semibold">Créer un compte</h2>
            <p className="mb-8 mt-1.5 text-[14px] text-muted">Un code de confirmation te sera envoyé par e-mail.</p>
            <div className="space-y-4">
              <BubbleField label="Nom complet" autoComplete="name" value={fullName} onChange={edit(setFullName)} onBlur={blur("fullName")} error={show("fullName")} placeholder="Prénom Nom" />
              <BubbleField label="E-mail" type="email" autoComplete="email" value={email} onChange={edit(setEmail)} onBlur={blur("email")} error={show("email")} placeholder="nom@exemple.cm" />
              <BubbleField
                label="Mot de passe"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={edit(setPassword)}
                onBlur={blur("password")}
                error={show("password")}
                hint={<Rule ok={password.length >= 8}>8 caractères minimum</Rule>}
              />
              <BubbleField
                label="Confirmer le mot de passe"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={edit(setConfirm)}
                onBlur={blur("confirm")}
                error={show("confirm")}
                hint={confirm && !errors.confirm ? <Rule ok>Les deux mots de passe correspondent</Rule> : undefined}
              />
            </div>
            {error && (
              <p role="alert" className="mt-4 rounded-xl bg-red/10 px-4 py-2.5 text-[13px] text-red">
                {error}
              </p>
            )}
            <BubbleButton tone="ink" size="lg" className="mt-8 w-full" disabled={loading}>
              {loading ? "Création…" : "Créer mon compte"} <ArrowRight size={18} />
            </BubbleButton>
            <Link href="/connexion" className="mt-4 block text-center text-[13.5px] font-medium text-muted hover:text-ink">
              J’ai déjà un compte : se connecter
            </Link>
          </form>
        )}
      </section>
    </main>
  );
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUp />
    </Suspense>
  );
}
