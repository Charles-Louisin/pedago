// Captures d'écran et courtes vidéos de l'app PEDAGO (version web de l'app, format téléphone), pour le site.
// Prérequis : API (:5000) et app web (:8082) lancées ; compte de capture CAPTURE_EMAIL / CAPTURE_PASSWORD (.env.local),
// créé par le seed (SEED_TEACHER_EMAIL=… npm run seed) — sinon le compte enseignant de démonstration.
// Usage : node scripts/capture-app.mjs  → public/site/screens/*.jpg et public/site/videos/*.webm (+ affiches .png)
// Options : CAPTURE_ONLY=screens|videos, CAPTURE_VIDEOS=journee,fiche,bilan,bibliotheque,programme
import { chromium } from "playwright-core";
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const APP = process.env.APP_URL ?? "http://localhost:8082";
const API = process.env.API_URL ?? "http://localhost:5000/api/v1";
const localEnv = fs.existsSync(".env.local") ? Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])) : {};
const seed = fs.readFileSync(path.resolve("../pedago-api/src/seed/seed.ts"), "utf8");
const EMAIL = process.env.CAPTURE_EMAIL ?? localEnv.CAPTURE_EMAIL ?? seed.match(/SEED_TEACHER_EMAIL \|\| "([^"]+)"/)[1];
const PASSWORD = process.env.CAPTURE_PASSWORD ?? localEnv.CAPTURE_PASSWORD ?? seed.match(/SEED_TEACHER_PASSWORD \|\| "([^"]+)"/)[1];
const OUT = path.resolve("public/site");
const SCREENS = path.join(OUT, "screens");
const VIDEOS = path.join(OUT, "videos");
const RAW = fs.mkdtempSync(path.join(os.tmpdir(), "pedago-capture-"));
fs.mkdirSync(SCREENS, { recursive: true });
fs.mkdirSync(VIDEOS, { recursive: true });

// Encodeur vidéo fourni par Playwright (VP8 / WebM).
const msPw = path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData/Local"), "ms-playwright");
const ffDir = fs.readdirSync(msPw).filter((d) => d.startsWith("ffmpeg-")).sort().pop();
const FFMPEG = path.join(msPw, ffDir, process.platform === "win32" ? "ffmpeg-win64.exe" : "ffmpeg-linux");

const VIEW = { width: 390, height: 844 };
// Mardi 24 novembre 2026, 9 h 10 : une journée de classe en cours.
const NOW = new Date("2026-11-24T09:10:00");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "msedge", headless: true });

/* ───────── Préparation : fiche manuscrite (photo) lue par l'IA, sur la leçon de mathématiques du mardi ───────── */
async function prepare() {
  const j = (r) => r.json();
  const login = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier: EMAIL, password: PASSWORD }) }).then(j);
  if (!login.accessToken) throw new Error("Connexion du compte de capture impossible : " + JSON.stringify(login).slice(0, 200));
  const H = { Authorization: `Bearer ${login.accessToken}` };
  const plan = await fetch(`${API}/teacher/planning?from=2026-11-24&to=2026-11-24`, { headers: H }).then(j);
  const lesson = plan.lessons.find((x) => x.subjectCode === "MATH") ?? plan.lessons[0];
  const existing = await fetch(`${API}/teacher/preps/${lesson.node.id}`, { headers: H }).then(j).catch(() => null);
  if (!existing?.fileUrl) {
    const page = await browser.newPage();
    const dataUrl = await page.evaluate(PHOTO);
    await page.close();
    const form = new FormData();
    form.append("kind", "prep");
    form.append("file", new Blob([Buffer.from(dataUrl.split(",")[1], "base64")], { type: "image/jpeg" }), "photo-fiche.jpg");
    const imp = await fetch(`${API}/teacher/imports`, { method: "POST", headers: H, body: form }).then(j);
    if (!imp.data) throw new Error("Import de la fiche impossible : " + JSON.stringify(imp).slice(0, 200));
    await fetch(`${API}/teacher/preps/${lesson.node.id}`, { method: "PUT", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify({ content: imp.data, uploadId: imp.uploadId, layout: imp.layout }) });
    console.log("fiche manuscrite importée");
  }
  return { id: lesson.id, node: lesson.node.id };
}

/** Photo d'une fiche manuscrite (dessinée au canevas, avec grain de photo) → data URL JPEG. */
const PHOTO = `(() => {
const W = 1240, H = 1754; const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
g.fillStyle = '#d9d4c7'; g.fillRect(0, 0, W, H); g.save(); g.translate(W/2, H/2); g.rotate(-0.012); g.translate(-W/2, -H/2);
g.fillStyle = '#fbfaf5'; g.fillRect(40, 40, W-80, H-80);
g.strokeStyle = 'rgba(120,140,200,0.18)'; for (let y = 120; y < H-60; y += 32) { g.beginPath(); g.moveTo(60, y); g.lineTo(W-60, y); g.stroke(); }
const cx = 170, cy = 170, r = 70, cols = ['#007a5e', '#ce1126', '#fcd116'];
for (let i = 0; i < 3; i++) { g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI*2); g.clip(); g.fillStyle = cols[i]; g.fillRect(cx - r + i*(2*r/3), cy - r, 2*r/3 + 1, 2*r); g.restore(); }
g.fillStyle = '#fcd116'; g.beginPath(); g.arc(cx, cy, 16, 0, Math.PI*2); g.fill();
const ink = '#1d2b6b', blue = '#123c9c'; g.fillStyle = ink;
g.font = 'bold 54px "Comic Sans MS", cursive'; g.textAlign = 'center'; g.fillText('Fiche de préparation', W/2 + 60, 190);
g.textAlign = 'left'; g.font = '34px "Comic Sans MS", cursive'; let y = 330;
for (const l of ['École : EP Mvog-Ada', 'Classe : CP', 'Effectif : 58', 'Date : 24/11/2026', 'Discipline : Mathématiques']) { g.fillText(l, 90, y); y += 50; }
const head = (t) => { y += 26; g.fillStyle = blue; g.font = 'bold 38px "Comic Sans MS", cursive'; g.fillText(t, 90, y); const w = g.measureText(t).width; g.strokeStyle = blue; g.lineWidth = 3; g.beginPath(); g.moveTo(90, y + 8); g.lineTo(90 + w, y + 8); g.stroke(); y += 52; g.fillStyle = ink; g.font = '33px "Comic Sans MS", cursive'; };
const line = (t) => { g.fillText(t, 110, y); y += 46; };
head('Objectif :'); line('- Soustraire deux nombres inférieurs à 20');
head('Matériel :'); line('bâtonnets, ardoises, craie');
head('Déroulement :'); line('1. Rappel (5 min) : compter de 2 en 2'); line('2. Situation problème (15 min) : Ali a 12 mangues,'); line('    il en donne 5. Combien lui en reste-t-il ?'); line('3. Synthèse (10 min) : 12 - 5 = 7');
head('Je retiens :'); line('Soustraire, c’est enlever une quantité.');
head('Exercice :'); line('15 - 6 = ...        9 - 4 = ...');
for (let i = 0; i < 12; i++) { const x = 140 + i*78, yy = y + 50; g.fillStyle = i < 5 ? '#f2a33a' : '#f6c34a'; g.beginPath(); g.ellipse(x, yy, 26, 34, 0.4, 0, Math.PI*2); g.fill(); g.strokeStyle = '#3d6b1f'; g.lineWidth = 4; g.beginPath(); g.moveTo(x+6, yy-34); g.lineTo(x+14, yy-48); g.stroke(); if (i < 5) { g.strokeStyle = '#b3261e'; g.lineWidth = 5; g.beginPath(); g.moveTo(x-30, yy-34); g.lineTo(x+30, yy+34); g.stroke(); } }
g.restore();
const img = g.getImageData(0, 0, W, H); for (let i = 0; i < img.data.length; i += 4) { const n = (Math.random() - 0.5) * 14; img.data[i] += n; img.data[i+1] += n; img.data[i+2] += n; } g.putImageData(img, 0, 0);
return c.toDataURL('image/jpeg', 0.82);
})()`;

async function context({ video = false } = {}) {
  const ctx = await browser.newContext({
    viewport: VIEW,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "fr-FR",
    timezoneId: "Africa/Douala",
    colorScheme: "light",
    ...(video ? { recordVideo: { dir: RAW, size: VIEW } } : {}),
  });
  await ctx.clock.install({ time: NOW });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30_000);
  return { ctx, page };
}

/** Connexion par l'écran de l'app ; renvoie l'instant (ms depuis le début de la vidéo) où l'app est prête. */
async function login(page, t0) {
  await page.goto(`${APP}/connexion`);
  await page.getByLabel("Adresse e-mail").waitFor();
  await page.getByLabel("Adresse e-mail").fill(EMAIL);
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Mot de passe", { exact: true }).press("Enter");
  await page.getByText("Aujourd’hui", { exact: true }).first().waitFor();
  await settled(page);
  // Programme synchronisé : une vraie leçon du jour est affichée (et non « Pas de cours » le temps de la synchro).
  await page.getByText(/\d{2}:\d{2} – \d{2}:\d{2}/).first().waitFor({ timeout: 20_000 }).catch(() => undefined);
  await sleep(1200);
  return Date.now() - t0;
}

/** Attend que l'écran de démarrage de l'app (intro animée, testID « intro-loader ») ait quitté la page. */
async function settled(page) {
  await page.locator('[data-testid="intro-loader"]').waitFor({ state: "detached", timeout: 30_000 }).catch(() => undefined);
  await sleep(400);
}

async function shot(page, name) {
  await sleep(700);
  await page.screenshot({ path: path.join(SCREENS, `${name}.jpg`), type: "jpeg", quality: 84 });
  console.log("écran", name);
}

/** Enregistre un scénario puis garde la partie utile (à partir de `from` ms), en WebM léger + affiche. */
// CAPTURE_VIDEOS=bibliotheque,programme : ne refaire que ces vidéos (chaque vidéo ouvre une session ;
// l'API limite les connexions à 10 par quart d'heure et par compte).
const PICK = process.env.CAPTURE_VIDEOS?.split(",").map((s) => s.trim()).filter(Boolean);

async function film(name, scenario) {
  if (PICK && !PICK.includes(name)) return;
  const t0 = Date.now();
  const { ctx, page } = await context({ video: true });
  const from = await scenario(page, t0);
  await sleep(600);
  const raw = await page.video().path();
  await ctx.close();
  const out = path.join(VIDEOS, `${name}.webm`);
  // VP9 (seul encodeur de l'ffmpeg de Playwright) : qualité constante, encodage rapide.
  execFileSync(FFMPEG, ["-y", "-i", raw, "-ss", String(Math.max(0, from / 1000)), "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "36", "-deadline", "realtime", "-cpu-used", "8", "-row-mt", "1", "-an", out], { stdio: "ignore" });
  execFileSync(FFMPEG, ["-y", "-i", out, "-ss", "0.5", "-frames:v", "1", path.join(VIDEOS, `${name}.png`)], { stdio: "ignore" });
  console.log("vidéo", name, (fs.statSync(out).size / 1024).toFixed(0), "Ko");
}

try {
  const lesson = await prepare();
  const only = process.env.CAPTURE_ONLY;
  /* ───────── Écrans fixes ───────── */
  if (only !== "videos") {
    const { ctx, page } = await context();
    await page.goto(`${APP}/onboarding`);
    await page.getByText("Ta journée de classe,").waitFor();
    await sleep(5000);
    await shot(page, "onboarding");
    await page.goto(`${APP}/connexion`);
    await page.getByLabel("Adresse e-mail").waitFor();
    await sleep(1500);
    await shot(page, "connexion");
    await login(page, Date.now());
    await shot(page, "accueil");
    await page.locator('a[href="/programme"]').last().click();
    await page.getByText("Semaine", { exact: true }).waitFor();
    await shot(page, "programme");
    await page.getByRole("button", { name: /^Filtres/ }).click();
    await page.getByText("Réinitialiser").waitFor();
    await shot(page, "filtres");
    await page.keyboard.press("Escape");
    await page.locator('a[href="/fiches"]').last().click();
    await page.getByText("Bibliothèque", { exact: true }).first().click();
    await page.getByText("Mathématiques", { exact: true }).first().waitFor();
    await shot(page, "bibliotheque");
    await page.locator('a[href="/moi"]').last().click();
    await page.getByText("Ma classe").waitFor();
    await shot(page, "moi");
    await page.goto(`${APP}/telechargements`);
    await page.getByText("Hors connexion").first().waitFor();
    await shot(page, "hors-connexion");
    await page.goto(`${APP}/bilan?date=2026-11-24`);
    await page.getByText("Enregistrer le bilan").waitFor();
    await shot(page, "bilan");
    // Fiche manuscrite importée (photo) de la leçon de mathématiques du mardi.
    await page.goto(`${APP}/fiche/${lesson.node}?lessonId=${lesson.id}`);
    await page.getByText("Agrandir").waitFor();
    await sleep(2500);
    await shot(page, "fiche");
    await page.goto(`${APP}/generer?lessonId=${lesson.id}`);
    await page.getByText("Télécharger le PDF").waitFor();
    await sleep(2500);
    await shot(page, "imprimer");
    await ctx.close();
  }

  /* ───────── Fiche A4 en grand (texture de la scène 3D du site) ───────── */
  if (only !== "videos") {
    const ctx = await browser.newContext({ viewport: { width: 760, height: 1400 }, deviceScaleFactor: 2, locale: "fr-FR", timezoneId: "Africa/Douala" });
    await ctx.clock.install({ time: NOW });
    const page = await ctx.newPage();
    await login(page, Date.now());
    await page.goto(`${APP}/fiche/${lesson.node}?lessonId=${lesson.id}`);
    const a4 = page.locator('[aria-label^="Aperçu : "]').first();
    await a4.waitFor();
    await sleep(3500);
    await a4.screenshot({ path: path.join(SCREENS, "fiche-a4.jpg"), type: "jpeg", quality: 88 });
    console.log("écran fiche-a4");
    await ctx.close();
  }

  /* ───────── Vidéos (8 à 14 s) ───────── */
  if (only === "screens") process.exit(0);
  // Le bilan filmé est réellement enregistré : la journée est remise « à faire » avant chaque tournage.
  // Commande constante (aucune donnée extérieure dans la ligne) ; l'adresse passe par l'environnement.
  execSync("npx tsx scripts/reset-capture.ts 2026-11-24", { cwd: path.resolve("../pedago-api"), env: { ...process.env, CAPTURE_EMAIL: EMAIL }, stdio: "inherit" });
  await film("journee", async (page, t0) => {
    const from = await login(page, t0);
    await sleep(2500);
    await page.mouse.wheel(0, 380);
    await sleep(1800);
    await page.mouse.wheel(0, -380);
    await sleep(1200);
    // Bouton absent si le bilan du jour a déjà été fait (par une capture précédente) : on n'en dépend pas.
    await page.getByRole("button", { name: /Faire le bilan/ }).waitFor({ timeout: 4000 }).catch(() => undefined);
    const day = page.getByText("Ven", { exact: true }).first();
    if (await day.count()) {
      await day.click();
      await sleep(1800);
    }
    return from - 300;
  });

  await film("fiche", async (page, t0) => {
    const from = await login(page, t0);
    await page.goto(`${APP}/fiche/${lesson.node}?lessonId=${lesson.id}`);
    await page.getByText("Agrandir").waitFor();
    await settled(page);
    const ready = Date.now() - t0;
    await sleep(2500);
    await page.getByText("Agrandir").click();
    await sleep(1600);
    await page.mouse.move(300, 500);
    await page.mouse.wheel(260, 0);
    await sleep(1400);
    await page.mouse.wheel(0, 420);
    await sleep(1500);
    await page.getByText("Ajuster").click();
    await sleep(1200);
    await page.getByText("Imprimer cette fiche").click();
    await page.getByText("Télécharger le PDF").waitFor();
    await sleep(2600);
    return Math.max(from, ready - 200);
  });

  await film("bilan", async (page, t0) => {
    await login(page, t0);
    await page.goto(`${APP}/bilan?date=2026-11-24`);
    await page.getByText("Enregistrer le bilan").waitFor();
    await settled(page);
    const ready = Date.now() - t0;
    await sleep(1500);
    const partiel = page.getByText("Partiel", { exact: true }).first();
    await partiel.click();
    await sleep(1800);
    await page.mouse.wheel(0, 300);
    await sleep(1200);
    await page.getByText("Enregistrer le bilan").click();
    await sleep(2800);
    return ready - 200;
  });

  await film("bibliotheque", async (page, t0) => {
    await login(page, t0);
    await page.locator('a[href="/fiches"]').last().click();
    // La vidéo commence sur la bibliothèque déjà chargée (pas sur l'onglet « Mes fiches », vide).
    await page.getByText("Bibliothèque", { exact: true }).first().click();
    await page.getByText("Mathématiques", { exact: true }).first().waitFor();
    await sleep(600);
    const ready = Date.now() - t0;
    await sleep(1500);
    await page.getByText("Mathématiques", { exact: true }).first().click();
    await sleep(1800);
    await page.locator('a[href*="/ressource/"], [role="link"][href*="/ressource/"]').first().click().catch(async () => {
      await page.getByText(/Fiche de préparation/).first().click();
    });
    await page.getByText("Aperçu", { exact: true }).first().waitFor();
    await sleep(2600);
    await page.mouse.wheel(0, 500);
    await sleep(1800);
    return ready - 200;
  });

  await film("programme", async (page, t0) => {
    await login(page, t0);
    await page.locator('a[href="/programme"]').last().click();
    await page.getByText("Semaine", { exact: true }).waitFor();
    const ready = Date.now() - t0;
    await sleep(1500);
    await page.getByRole("button", { name: /^Filtres/ }).click();
    await sleep(1500);
    await page.getByText("Mathématiques", { exact: true }).last().click();
    await sleep(900);
    await page.getByText(/^Afficher/).click();
    await sleep(1400);
    await page.getByText("Année", { exact: true }).click();
    await sleep(2200);
    return ready - 200;
  });
} finally {
  await browser.close();
  try {
    fs.rmSync(RAW, { recursive: true, force: true });
  } catch {
    // Fichiers encore verrouillés par le navigateur (Windows) : le dossier temporaire sera nettoyé par le système.
  }
}
