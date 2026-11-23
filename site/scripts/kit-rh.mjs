// Kit RH d'une page (FR et EN), PDF A4 : délais d'assurance maladie des frontaliers et des nouveaux arrivants,
// avec deux codes QR vers le simulateur frontalier et le guide « Arriver en Suisse ».
// Usage : node scripts/kit-rh.mjs   (depuis site/)  → public/kit-rh/guide-assurance-kit-rh-{fr,en}.pdf
// Playwright (Chromium) : PLAYWRIGHT=/chemin/vers/node_modules/playwright, sinon celui d'episto.
// Les adresses des QR portent utm_source=kit-rh, sans aucun identifiant personnel.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ICI = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(ICI, "..");
const qrcode = require("./vendor/qrcode-generator-1.4.4.cjs");
const { chromium } = require(process.env.PLAYWRIGHT ?? "/home/sam/dev/episto/node_modules/playwright");

const BASE = "https://guide-assurance.ch";
const ETAT = { fr: "novembre 2026", en: "November 2026" };
const N = " ";

/* Code QR en SVG (chemin unique, modules carrés), correction d'erreur M. */
function qrSvg(texte, taille = 132) {
  const qr = qrcode(0, "M");
  qr.addData(texte);
  qr.make();
  const n = qr.getModuleCount();
  const m = 2; // marge en modules (la carte blanche autour fait le reste)
  let d = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) d += `M${x + m} ${y + m}h1v1h-1z`;
  const v = n + 2 * m;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${v} ${v}" width="${taille}" height="${taille}" shape-rendering="crispEdges" role="img" aria-label="QR"><rect width="${v}" height="${v}" fill="#fff"/><path d="${d}" fill="#111"/></svg>`;
}

/* Polices intégrées en base64 : une page chargée par setContent ne lit pas les fichiers locaux. */
const police = (f) => `data:font/ttf;base64,${fs.readFileSync(path.join(SITE, "src/og", f)).toString("base64")}`;
const logo = fs.readFileSync(path.join(SITE, "public/brand/logo-tuile-sombre.svg"), "utf8");

const T = {
  fr: {
    lang: "fr-CH",
    kit: "Kit RH",
    sur: "Assurance maladie des nouveaux collaborateurs",
    titre: `Frontalier ou nouvel arrivant${N}: deux délais de trois mois`,
    intro: "Une fiche à remettre avec le contrat de travail. L’assurance maladie de base est individuelle : c’est le collaborateur qui la choisit et la conclut. S’il connaît ces délais dès l’embauche, il évite une affiliation d’office ou un supplément de prime.",
    a: {
      titre: "Il vit en France et travaille en Suisse",
      lignes: [
        `Il a <b>3 mois dès le début de son activité en Suisse</b> pour choisir entre la LAMal et l’assurance maladie française. C’est le droit d’option (art. 3, al. 3, LAMal ; CLEISS).`,
        "Ce choix est en principe irrévocable et engage aussi les membres de sa famille sans activité lucrative.",
        "À Genève, s’il ne renvoie pas le formulaire du Service de l’assurance-maladie dans ce délai, il est affilié d’office à la LAMal.",
        "Côté français, le choix se déclare avec le formulaire « Choix du système d’assurance-maladie ».",
      ],
      qr: `${BASE}/simulateur-frontalier/?utm_source=kit-rh&utm_medium=qr&utm_campaign=kit-rh-fr`,
      qrTexte: "Comparer la LAMal et l’assurance française pour tout le foyer",
      qrUrl: "guide-assurance.ch/simulateur-frontalier",
    },
    b: {
      titre: "Il s’installe en Suisse",
      lignes: [
        `Il a <b>3 mois après sa prise de domicile</b> pour conclure l’assurance maladie de base (art. 3, al. 1, LAMal). Dans ce délai, la couverture remonte au jour de son arrivée (art. 5, al. 1, LAMal).`,
        "En cas de retard, la couverture ne commence qu’à l’affiliation et un supplément de prime peut être dû (art. 5, al. 2, LAMal). Le canton contrôle l’affiliation.",
        "Avec au moins 8 heures par semaine chez vous, il est assuré par votre LAA aussi pour les accidents non professionnels (art. 13 OLAA). Sur attestation de votre part, il peut suspendre la couverture accidents de sa prime LAMal (art. 8 LAMal).",
      ],
      qr: `${BASE}/nouveaux-arrivants/?utm_source=kit-rh&utm_medium=qr&utm_campaign=kit-rh-fr`,
      qrTexte: "Les assurances des trois premiers mois, étape par étape",
      qrUrl: "guide-assurance.ch/nouveaux-arrivants",
    },
    rappel: `Remettez la fiche avec le contrat de travail ou le premier jour, sur papier ou par e-mail. Le délai de trois mois court dès le premier jour de travail pour le frontalier et dès la prise de domicile pour le nouvel arrivant.`,
    pied: `Information générale, sans conseil personnalisé. Sources${N}: Fedlex (LAMal, OAMal, OLAA), CLEISS, canton de Genève. État${N}: ${ETAT.fr}.`,
    lien: "guide-assurance.ch/entreprises/kit-rh",
    fichier: "guide-assurance-kit-rh-fr.pdf",
  },
  en: {
    lang: "en",
    kit: "HR kit",
    sur: "Health insurance for new employees",
    titre: "Cross-border worker or newcomer: two three-month deadlines",
    intro: "A sheet to hand out with the employment contract. Basic health insurance is individual: the employee chooses and takes out the policy. If they know these deadlines from day one, they avoid being enrolled automatically or paying a premium surcharge.",
    a: {
      titre: "Lives in France, works in Switzerland",
      lignes: [
        `They have <b>3 months from the start of their work in Switzerland</b> to choose between Swiss LAMal and French health insurance. This is the right of option (art. 3 para. 3 LAMal; CLEISS).`,
        "The choice is in principle irrevocable and also applies to family members without gainful employment.",
        "In Geneva, anyone who does not return the cantonal health insurance office’s form within this period is enrolled in LAMal automatically.",
        "On the French side, the choice is declared with the form “Choix du système d’assurance-maladie”.",
      ],
      qr: `${BASE}/en/cross-border-calculator/?utm_source=kit-rh&utm_medium=qr&utm_campaign=kit-rh-en`,
      qrTexte: "Compare LAMal and French health insurance for the whole household",
      qrUrl: "guide-assurance.ch/en/cross-border-calculator",
    },
    b: {
      titre: "Moves to Switzerland",
      lignes: [
        `They have <b>3 months after taking up residence</b> to take out basic health insurance (art. 3 para. 1 LAMal). Within this period, cover goes back to the day they arrived (art. 5 para. 1 LAMal).`,
        "If they are late, cover only starts on enrolment and a premium surcharge may be due (art. 5 para. 2 LAMal). The canton checks enrolment.",
        "Working at least 8 hours a week for you, they are covered by your accident insurance (LAA) for non-work accidents too (art. 13 OLAA). With your certificate, they can suspend accident cover in their LAMal premium (art. 8 LAMal).",
      ],
      qr: `${BASE}/en/moving-to-switzerland/?utm_source=kit-rh&utm_medium=qr&utm_campaign=kit-rh-en`,
      qrTexte: "Insurance in the first three months, step by step",
      qrUrl: "guide-assurance.ch/en/moving-to-switzerland",
    },
    rappel: "Hand the sheet out with the employment contract or on the first day, on paper or by e-mail. The three months run from the first working day for a cross-border worker and from taking up residence for a newcomer.",
    pied: `General information, not personal advice. Sources: Fedlex (LAMal, OAMal, OLAA), CLEISS, canton of Geneva. Status: ${ETAT.en}.`,
    lien: "guide-assurance.ch/en/business/hr-kit",
    fichier: "guide-assurance-kit-rh-en.pdf",
  },
};

const colonne = (c, n) => `
  <section class="col">
    <p class="num">${n}</p>
    <h2>${c.titre}</h2>
    <ul>${c.lignes.map((l) => `<li>${l}</li>`).join("")}</ul>
    <div class="qr">
      ${qrSvg(c.qr)}
      <p><b>${c.qrTexte}</b><span>${c.qrUrl.replace("/", "/<wbr>")}</span></p>
    </div>
  </section>`;

const html = (t) => `<!doctype html>
<html lang="${t.lang}"><head><meta charset="utf-8"><title>${t.kit} · Guide Assurance</title>
<style>
@font-face{font-family:A;src:url(${police("archivo-500.ttf")});font-weight:500}
@font-face{font-family:A;src:url(${police("archivo-800.ttf")});font-weight:800}
@font-face{font-family:AL;src:url(${police("archivo-large-500.ttf")});font-weight:500}
@font-face{font-family:AL;src:url(${police("archivo-large-800.ttf")});font-weight:800}
@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body{margin:0;font-family:A,system-ui,sans-serif;word-spacing:.06em;color:#1A1C19;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;height:297mm;display:flex;flex-direction:column;padding:13mm 14mm 10mm;position:relative}
.page::after{content:"";position:absolute;left:0;right:0;bottom:0;height:4mm;background:#C8202F}
header{display:flex;align-items:center;gap:4mm;padding-bottom:5mm;border-bottom:1.2pt solid #1A1C19}
header svg{width:15mm;height:15mm}
.marque{font-family:AL;line-height:1;letter-spacing:.6pt;font-size:11pt}
.marque span{display:block}.marque .g{color:#C8202A;font-weight:500}.marque .a{font-weight:800;margin-top:1mm}
.kit{margin-left:auto;text-align:right;font-size:10pt;color:#4A4E47}
.kit b{display:block;font-size:13pt;color:#1A1C19;font-weight:800}
h1{font-size:27pt;line-height:1.08;font-weight:800;margin:7mm 0 3mm;letter-spacing:-.3pt;text-wrap:balance}
.intro{font-size:11.5pt;line-height:1.45;margin:0 0 6mm;max-width:170mm;color:#2A2D28}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:6mm;flex:1}
.col{background:#F3F6F1;border-radius:3mm;padding:6mm 6mm 5mm;display:flex;flex-direction:column}
.num{margin:0;font-family:AL;font-weight:800;font-size:10pt;color:#B3741F;letter-spacing:1pt}
h2{font-size:15pt;line-height:1.15;margin:1.5mm 0 3mm;font-weight:800}
ul{margin:0;padding-left:4.5mm;font-size:10.8pt;line-height:1.45}
li{margin:0 0 2.4mm}li::marker{color:#C8202A}
li b{font-weight:800}
.qr{margin-top:auto;display:flex;gap:4mm;align-items:center;background:#fff;border-radius:2.5mm;padding:3mm}
.qr svg{flex:none;width:30mm;height:30mm}
.qr p{margin:0;font-size:9.6pt;line-height:1.35}.qr b{display:block;font-weight:800;margin-bottom:1.5mm}.qr span{color:#1C5C88;font-size:9pt}
.rappel{margin:6mm 0 0;font-size:10pt;line-height:1.45;padding:4mm 5mm;border-left:1.5mm solid #D9953C;background:#FFF6E0}
footer{margin-top:5mm;display:flex;justify-content:space-between;gap:6mm;font-size:8.4pt;color:#4A4E47;line-height:1.4}
footer b{color:#1A1C19;white-space:nowrap}
</style></head>
<body><div class="page">
<header>${logo.replace("<svg", '<svg aria-hidden="true"')}
  <div class="marque"><span class="g">GUIDE</span><span class="a">ASSURANCE</span></div>
  <div class="kit"><b>${t.kit}</b>${t.sur}</div>
</header>
<h1>${t.titre}</h1>
<p class="intro">${t.intro}</p>
<div class="cols">${colonne(t.a, "1")}${colonne(t.b, "2")}</div>
<p class="rappel">${t.rappel}</p>
<footer><span>${t.pied}</span><b>${t.lien}</b></footer>
</div></body></html>`;

const sortie = path.join(SITE, "public/kit-rh");
fs.mkdirSync(sortie, { recursive: true });
const navigateur = await chromium.launch();
try {
  for (const l of ["fr", "en"]) {
    const t = T[l];
    const page = await navigateur.newPage();
    await page.setContent(html(t), { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const f = path.join(sortie, t.fichier);
    await page.pdf({ path: f, format: "A4", printBackground: true, preferCSSPageSize: true });
    /* Aperçu de la page web du kit (JPEG, largeur A4 à 96 dpi). */
    await page.setViewportSize({ width: 794, height: 1123 });
    await page.screenshot({ path: path.join(sortie, `apercu-${l}.jpg`), type: "jpeg", quality: 80 });
    if (process.env.KIT_HTML) fs.writeFileSync(f.replace(/\.pdf$/, ".html"), html(t));
    const pages = (fs.readFileSync(f, "latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
    console.log(`${path.relative(SITE, f)} : ${Math.round(fs.statSync(f).size / 1024)} Ko, ${pages} page(s)`);
    if (pages !== 1) throw new Error(`${t.fichier} : ${pages} pages au lieu d'une`);
    await page.close();
  }
} finally {
  await navigateur.close();
}
