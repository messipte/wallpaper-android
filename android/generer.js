// Génère un fond d'écran et l'applique sur le téléphone (Termux).
//
// Étapes :
//   1. tirage au hasard du champ, de la palette et de la rampe (champs.js)
//   2. une case = un glyphe coloré → on écrit un fichier SVG (du texte, aucune bibliothèque)
//   3. rsvg-convert transforme le SVG en PNG à la taille de l'écran
//   4. la "recette" du tirage est écrite dans le PNG (chunk texte "tirage")
//   5. on garde au plus MAX_HISTORIQUE images, les plus anciennes sont effacées
//   6. termux-wallpaper applique l'image (accueil + écran de verrouillage)
//
// Lancement manuel :   node generer.js
// Sans appliquer :     node generer.js --sans-appliquer   (pour tester, ou sur un ordinateur)

const path = require("path");
const fs = require("fs");
const zlib = require("zlib");
const { execFileSync } = require("child_process");
const { tirer } = require("./champs");

// ---------- Réglages ----------
const LARGEUR = 720;   // écran du Honor 400 Smart en portrait (720 × 1610, donné par Tom)
const HAUTEUR = 1610;
const CASE = 14;       // taille d'une case en pixels (fontSize 14 sur le PC) — plus petit = plus fin
const MAX_HISTORIQUE = 500; // même limite que sur le PC
const ECRAN_VERROUILLAGE = true; // false = écran d'accueil seulement

const ICI = __dirname;
const HISTORIQUE = path.join(ICI, "historique");
const GLYPHES = JSON.parse(fs.readFileSync(path.join(ICI, "glyphes.json"), "utf8"));

const appliquer = !process.argv.includes("--sans-appliquer");

// ---------- 1. Tirage ----------
const { field, palette, ramp, t, meta, sampleGradient } = tirer();

// ---------- 2. SVG ----------
// La grille : autant de cases entières que possible, centrée dans l'écran.
const cols = Math.floor(LARGEUR / CASE);
const rows = Math.floor(HAUTEUR / CASE);
const margeX = (LARGEUR - cols * CASE) / 2;
const margeY = (HAUTEUR - rows * CASE) / 2;

// Les glyphes sont des chemins en "unités de police" (1024 par case), axe y vers le haut.
// On les ramène une fois pour toutes à la taille d'une case, axe y vers le bas :
// translate(0, ascendante) pose la ligne de base, scale(e, -e) réduit et retourne.
const e = CASE / GLYPHES.unitesParEm;
const base = GLYPHES.ascendante * e;
const idGlyphe = new Map(); // caractère → identifiant dans le SVG (g0, g1...)
const defs = [];
for (const c of new Set(ramp)) {
  if (c === " ") continue; // l'espace ne dessine rien
  const id = `g${idGlyphe.size}`;
  idGlyphe.set(c, id);
  defs.push(`<path id="${id}" transform="translate(0 ${base}) scale(${e} ${-e})" d="${GLYPHES.glyphes[c]}"/>`);
}

const [fr, fg, fb] = palette[0]; // fond = premier arrêt de la palette, comme sur le PC
const cases = [];
for (let row = 0; row < rows; row++) {
  for (let col = 0; col < cols; col++) {
    const v = field(col, row, cols, rows, t);
    const ch = ramp[Math.min(ramp.length - 1, Math.floor(v * ramp.length))];
    if (ch === " ") continue;
    const [r, g, b] = sampleGradient(palette, v);
    // <use> recopie le glyphe à la position de la case, avec sa couleur
    cases.push(`<use href="#${idGlyphe.get(ch)}" x="${margeX + col * CASE}" y="${margeY + row * CASE}" fill="rgb(${r},${g},${b})"/>`);
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${LARGEUR}" height="${HAUTEUR}" viewBox="0 0 ${LARGEUR} ${HAUTEUR}">
<defs>${defs.join("")}</defs>
<rect width="100%" height="100%" fill="rgb(${fr},${fg},${fb})"/>
${cases.join("\n")}
</svg>`;

// ---------- 3. PNG ----------
fs.mkdirSync(HISTORIQUE, { recursive: true });
const fichier = path.join(HISTORIQUE, `textmode_${horodatage()}.png`);
const fichierSvg = fichier.replace(/\.png$/, ".svg");
fs.writeFileSync(fichierSvg, svg);
try {
  execFileSync("rsvg-convert", ["-w", String(LARGEUR), "-h", String(HAUTEUR), "-o", fichier, fichierSvg]);
} finally {
  // le SVG ne sert qu'à la conversion ; force: true = pas d'erreur s'il a déjà disparu
  fs.rmSync(fichierSvg, { force: true });
}

// ---------- 4. Recette dans le PNG ----------
ajouterTexte(fichier, "tirage", JSON.stringify(meta));

// ---------- 5. Historique ----------
purger(HISTORIQUE, MAX_HISTORIQUE);

// ---------- 6. Fond d'écran ----------
if (appliquer) {
  // timeout : si l'appli Termux:API n'est pas installée, termux-wallpaper peut rester bloqué
  execFileSync("termux-wallpaper", ["-f", fichier], { timeout: 60000 });
  if (ECRAN_VERROUILLAGE) execFileSync("termux-wallpaper", ["-l", "-f", fichier], { timeout: 60000 });
}
console.log(`${new Date().toISOString()} OK ${path.basename(fichier)} ${JSON.stringify(meta)}`);

// ============================================================
// Fonctions utilitaires
// ============================================================

// Date et heure jusqu'aux millisecondes (2026-10-26_16-23-23-457) :
// deux lancements dans la même seconde donnent quand même deux noms différents.
function horodatage() {
  const d = new Date();
  const p = (n, chiffres = 2) => String(n).padStart(chiffres, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}-${p(d.getMilliseconds(), 3)}`;
}

// Garde les maxFichiers PNG les plus récents, efface les autres.
function purger(dossier, maxFichiers) {
  const pngs = fs
    .readdirSync(dossier)
    .filter((n) => n.toLowerCase().endsWith(".png"))
    .map((n) => path.join(dossier, n))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  for (const f of pngs.slice(maxFichiers)) fs.rmSync(f, { force: true }); // déjà effacé : pas d'erreur
}

// Ajoute un chunk texte (tEXt) dans un PNG, juste avant la fin du fichier (chunk IEND).
// Un PNG est une suite de blocs : longueur (4 octets) + type (4 lettres) + données + CRC (4 octets).
// Lecture ensuite : `identify -verbose fichier.png` (ImageMagick) ou Pillow en Python.
function ajouterTexte(fichier, cle, texte) {
  // tEXt n'accepte que du Latin-1 : les glyphes des rampes (▖▒▛█, ·•○●) sont
  // échappés en \uXXXX, que JSON.parse redécode normalement à la lecture.
  const ascii = texte.replace(/[^\x00-\x7F]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
  const donnees = Buffer.from(`${cle}\0${ascii}`, "latin1");
  const type = Buffer.from("tEXt", "latin1");

  const longueur = Buffer.alloc(4);
  longueur.writeUInt32BE(donnees.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([type, donnees])));
  const chunk = Buffer.concat([longueur, type, donnees, crc]);

  const png = fs.readFileSync(fichier);
  const fin = png.length - 12; // IEND = toujours les 12 derniers octets
  fs.writeFileSync(fichier, Buffer.concat([png.subarray(0, fin), chunk, png.subarray(fin)]));
}

// Somme de contrôle exigée par le format PNG pour chaque bloc.
// zlib.crc32 existe depuis Node 22.2 ; sinon calcul à la main (même résultat).
function crc32(buf) {
  if (zlib.crc32) return zlib.crc32(buf);
  let c = 0xffffffff;
  for (const octet of buf) {
    c ^= octet;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}
