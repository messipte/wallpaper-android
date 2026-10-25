// Tirage du fond d'écran : plusieurs couches de champs, mélangées avec de vrais modes
// de mélange (pas une simple moyenne, qui tire tout vers le gris moyen).
//
// Copie de ~/wallpaper-gen/textmode/sketch.js (version PC), sans textmode.js :
// ici on ne dessine rien, on renvoie seulement une fonction champ(col, row, cols, rows, t)
// qui donne un nombre entre 0 et 1 pour chaque case. Le dessin est fait par generer.js.
//
// Seul changement par rapport au PC : tm.noise() est remplacé par bruit() plus bas,
// recopié de l'algorithme de textmode.js 0.17.0 (lui-même identique à celui de p5.js).

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randRange(a, b) {
  return a + Math.random() * (b - a);
}
function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

// ============================================================
// Bruit (remplace tm.noise) — même algorithme que textmode.js / p5.js :
// une table de 4096 valeurs au hasard, interpolées en douceur (cosinus),
// 4 octaves empilées, chaque octave deux fois plus fine et deux fois plus faible.
// Résultat entre 0 et 1, toujours le même pour les mêmes (x, y, z) pendant un tirage.
// ============================================================

const TAILLE = 4095;
const table = Array.from({ length: TAILLE + 1 }, () => Math.random());
const lisse = (i) => 0.5 * (1 - Math.cos(i * Math.PI)); // 0→0, 0.5→0.5, 1→1, en courbe douce

function bruit(x, y = 0, z = 0) {
  x = Math.abs(x); y = Math.abs(y); z = Math.abs(z);
  let xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let xf = x - xi, yf = y - yi, zf = z - zi;
  let somme = 0, amp = 0.5;

  for (let o = 0; o < 4; o++) {
    // position dans la table : y décalé de 16 cases, z de 256
    let of = xi + (yi << 4) + (zi << 8);
    const rx = lisse(xf), ry = lisse(yf);

    let n1 = table[of & TAILLE];
    n1 += rx * (table[(of + 1) & TAILLE] - n1);
    let n2 = table[(of + 16) & TAILLE];
    n2 += rx * (table[(of + 17) & TAILLE] - n2);
    n1 += ry * (n2 - n1);

    of += 256;
    n2 = table[of & TAILLE];
    n2 += rx * (table[(of + 1) & TAILLE] - n2);
    let n3 = table[(of + 16) & TAILLE];
    n3 += rx * (table[(of + 17) & TAILLE] - n3);
    n2 += ry * (n3 - n2);

    n1 += lisse(zf) * (n2 - n1);
    somme += n1 * amp;
    amp *= 0.5;

    // octave suivante : coordonnées doublées
    xi <<= 1; xf *= 2; yi <<= 1; yf *= 2; zi <<= 1; zf *= 2;
    if (xf >= 1) { xi++; xf--; }
    if (yf >= 1) { yi++; yf--; }
    if (zf >= 1) { zi++; zf--; }
  }
  return somme;
}

// ============================================================
// Champs continus — chacun (col,row,cols,rows,t) -> 0..1
// ============================================================

function makeRadialRings() {
  const cx = randRange(0.3, 0.7), cy = randRange(0.3, 0.7);
  const freq = randRange(0.15, 0.5), speed = randRange(0.5, 2.5);
  return (col, row, cols, rows, t) => {
    const dx = col / cols - cx, dy = row / rows - cy;
    const dist = Math.hypot(dx, dy) * Math.max(cols, rows);
    return Math.sin(dist * freq - t * speed) * 0.5 + 0.5;
  };
}

function makeDrift(axis) {
  const freq = randRange(0.08, 0.3), speed = randRange(0.3, 1.5);
  const sign = pick([1, -1]);
  return (col, row, cols, rows, t) => {
    const v = axis === "h" ? col : row;
    return Math.sin(v * freq + sign * t * speed) * 0.5 + 0.5;
  };
}

function makeDiagonal() {
  const freq = randRange(0.1, 0.3), speed = randRange(0.3, 1.5);
  const sign = pick([1, -1]);
  return (col, row, cols, rows, t) => Math.sin((col + sign * row) * freq + t * speed) * 0.5 + 0.5;
}

function makeValueNoise() {
  const freq = randRange(0.03, 0.12), speed = randRange(0.05, 0.3);
  return (col, row, cols, rows, t) => bruit(col * freq, row * freq, t * speed);
}

// FBM — octaves de noise empilées, amplitude decroissante
function makeFBM() {
  const baseFreq = randRange(0.02, 0.06), speed = randRange(0.05, 0.25);
  const octaves = Math.floor(randRange(3, 5));
  return (col, row, cols, rows, t) => {
    let sum = 0, amp = 1, freq = baseFreq, ampTotal = 0;
    for (let o = 0; o < octaves; o++) {
      sum += bruit(col * freq, row * freq, t * speed) * amp;
      ampTotal += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum / ampTotal;
  };
}

function makeDomainWarp() {
  const wfreq = randRange(0.02, 0.08), wamp = randRange(5, 25);
  const freq = randRange(0.05, 0.15), speed = randRange(0.2, 1);
  return (col, row, cols, rows, t) => {
    const wx = col + (bruit(col * wfreq, row * wfreq) - 0.5) * wamp;
    const wy = row + (bruit(col * wfreq + 50, row * wfreq + 50) - 0.5) * wamp;
    return Math.sin((wx + wy) * freq - t * speed) * 0.5 + 0.5;
  };
}

function makeInterference() {
  const nSources = Math.floor(randRange(2, 4));
  const sources = [];
  for (let i = 0; i < nSources; i++) sources.push([randRange(0.1, 0.9), randRange(0.1, 0.9)]);
  const freq = randRange(0.2, 0.5), speed = randRange(0.5, 2);
  return (col, row, cols, rows, t) => {
    let sum = 0;
    for (const [sx, sy] of sources) {
      const d = Math.hypot(col / cols - sx, row / rows - sy) * cols;
      sum += Math.sin(d * freq - t * speed) * 0.5 + 0.5;
    }
    return sum / sources.length;
  };
}

// coordonnées polaires — spirales, rosaces
function makePolar() {
  const cx = randRange(0.3, 0.7), cy = randRange(0.3, 0.7);
  const armFreq = Math.floor(randRange(3, 9)); // nombre de "pétales"
  const radFreq = randRange(0.1, 0.35), speed = randRange(0.5, 2);
  const spiral = randRange(-0.02, 0.02); // torsion spirale
  return (col, row, cols, rows, t) => {
    const dx = col - cols * cx, dy = row - rows * cy;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    return Math.sin(angle * armFreq + dist * (radFreq + spiral) - t * speed) * 0.5 + 0.5;
  };
}

// distance à une forme (SDF) — cercle ou boîte arrondie
function makeSDF() {
  const cx = randRange(0.3, 0.7), cy = randRange(0.3, 0.7);
  const shape = pick(["circle", "box"]);
  const size = randRange(0.15, 0.35);
  const freq = randRange(0.05, 0.2), speed = randRange(0.3, 1.5);
  return (col, row, cols, rows, t) => {
    const dx = col / cols - cx, dy = row / rows - cy;
    let d;
    if (shape === "circle") {
      d = Math.hypot(dx, dy) - size;
    } else {
      const qx = Math.abs(dx) - size, qy = Math.abs(dy) - size;
      d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
    }
    return Math.sin(d * cols * freq - t * speed) * 0.5 + 0.5;
  };
}

// distance de Manhattan — losanges, symétries axiales
function makeManhattan() {
  const cx = randRange(0.3, 0.7), cy = randRange(0.3, 0.7);
  const freq = randRange(0.1, 0.3), speed = randRange(0.3, 1.5);
  return (col, row, cols, rows, t) => {
    const d = Math.abs(col - cols * cx) + Math.abs(row - rows * cy);
    return Math.sin(d * freq - t * speed) * 0.5 + 0.5;
  };
}

// modulo — colonnes, diagonales
function makeModulo() {
  const n = Math.floor(randRange(6, 24));
  const mode = pick(["col", "diag"]);
  return (col, row, cols, rows, t) => {
    const shift = Math.floor(t * 2);
    const v = mode === "col" ? (col + shift) % n : (col + row + shift) % n;
    return v / n;
  };
}

// bit ops — XOR/AND façon RUGS
function makeBitOps() {
  const mask = pick([15, 31, 63]);
  const scale = randRange(0.5, 2);
  const op = pick(["xor", "and"]);
  return (col, row, cols, rows, t) => {
    const i = Math.floor(col * scale + t * 2) & mask;
    const j = Math.floor(row * scale) & mask;
    const v = op === "xor" ? (i ^ j) : (i & j);
    return (v & mask) / mask;
  };
}

// Poisson-disk approché — points espacés par rejet, champ = distance au plus proche
function makePoissonCells() {
  const n = Math.floor(randRange(8, 18));
  const minDist = 0.12;
  const points = [];
  let tries = 0;
  while (points.length < n && tries < n * 40) {
    tries++;
    const p = [randRange(0, 1), randRange(0, 1)];
    if (points.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) > minDist)) points.push(p);
  }
  const speed = randRange(0.1, 0.6);
  return (col, row, cols, rows, t) => {
    const x = col / cols, y = row / rows;
    let d1 = Infinity, d2 = Infinity;
    for (const [px, py] of points) {
      const d = Math.hypot(x - px, y - (py + Math.sin(t * speed + px * 10) * 0.02));
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
    }
    return clamp01((d2 - d1) * 6); // met en valeur les bords des cellules
  };
}

// Combo exact du hero textmode.js décodé (organic.js) : anneaux + dérive H + dérive V,
// paramètres fixes (pas randomisés) pour rester fidèle à l'original. Tiré à part, pas
// mélangé au reste — voir plus bas "useHeroCombo".
function makeHeroCombo() {
  return (col, row, cols, rows, t) => {
    const dx = col - cols / 2, dy = row - rows / 2;
    const dist = Math.hypot(dx, dy);
    const a = Math.sin(dist * 0.3 - t * 2) * 0.5 + 0.5;
    const b = Math.sin(col * 0.2 + t) * 0.5 + 0.5;
    const c = Math.sin(row * 0.2 - t * 0.7) * 0.5 + 0.5;
    return (a + b + c) / 3;
  };
}

const FIELD_MAKERS = [
  { name: "radialRings", make: makeRadialRings },
  { name: "driftH", make: () => makeDrift("h") },
  { name: "driftV", make: () => makeDrift("v") },
  { name: "diagonal", make: makeDiagonal },
  { name: "valueNoise", make: makeValueNoise },
  { name: "fbm", make: makeFBM },
  { name: "domainWarp", make: makeDomainWarp },
  { name: "interference", make: makeInterference },
  { name: "polar", make: makePolar },
  { name: "sdf", make: makeSDF },
  { name: "manhattan", make: makeManhattan },
  { name: "modulo", make: makeModulo },
  { name: "bitOps", make: makeBitOps },
  { name: "poissonCells", make: makePoissonCells },
];

// ============================================================
// Modes de mélange entre couches (pas juste la moyenne)
// ============================================================

function blend(a, b, mode) {
  switch (mode) {
    case "avg": return (a + b) / 2;
    case "mul": return a * b;
    case "max": return Math.max(a, b);
    case "min": return Math.min(a, b);
    case "screen": return 1 - (1 - a) * (1 - b);
    case "diff": return Math.abs(a - b);
    case "xor": return (a > 0.5) !== (b > 0.5) ? 1 : 0;
    default: return (a + b) / 2;
  }
}

const BLEND_MODES = ["avg", "mul", "max", "min", "screen", "diff", "xor"];

function stackLayers(layers, modes) {
  return (col, row, cols, rows, t) => {
    let acc = layers[0](col, row, cols, rows, t);
    for (let i = 1; i < layers.length; i++) {
      acc = blend(acc, layers[i](col, row, cols, rows, t), modes[i - 1]);
    }
    return clamp01(acc);
  };
}

// quantification en bandes — approche "contour", pas du marching squares littéral
function makeBanded(field, nBands) {
  return (col, row, cols, rows, t) => {
    const v = field(col, row, cols, rows, t);
    return Math.round(v * nBands) / nBands;
  };
}

// ============================================================
// Palettes sobres — 2 à 6 arrêts de couleur (dégradé, pas juste duotone).
// Le premier arrêt sert aussi de fond (plus de noir figé indépendant de la palette).
// ============================================================

const PALETTES = [
  [[60, 90, 120], [0, 180, 180]],                                    // bleu-gris -> turquoise
  [[40, 40, 50], [180, 160, 120]],                                   // ardoise -> sable chaud
  [[45, 45, 45], [210, 205, 195]],                                   // anthracite -> blanc chaud
  [[10, 14, 20], [40, 60, 90], [0, 150, 170]],                       // marine -> teal
  [[15, 12, 10], [90, 70, 40], [200, 150, 90]],                      // expresso -> or
  [[8, 14, 10], [40, 70, 45], [140, 180, 120]],                      // forêt -> sauge
  [[16, 10, 16], [80, 50, 70], [190, 120, 150]],                     // prune -> mauve
  [[12, 16, 18], [60, 40, 35], [190, 90, 60]],                       // ardoise -> rouille
  [[10, 10, 18], [40, 40, 90], [90, 90, 220]],                       // nuit -> indigo
  [[10, 16, 14], [30, 90, 80], [80, 220, 190]],                      // teal sombre -> aqua
  [[18, 10, 10], [110, 40, 30], [220, 90, 50]],                      // brique -> braise
  [[10, 10, 10], [70, 20, 40], [180, 50, 90]],                       // noir -> pourpre
  [[12, 14, 10], [80, 90, 30], [190, 200, 80]],                      // olive -> chartreuse
  [[10, 10, 16], [50, 30, 80], [140, 90, 200]],                      // violet profond -> lavande
  [[14, 12, 10], [90, 60, 30], [210, 170, 80]],                      // ombre -> ambre
  [[16, 10, 12], [100, 40, 60], [220, 120, 140]],                    // vin -> saumon
  [[10, 12, 10], [40, 60, 40], [100, 160, 100], [200, 220, 150]],    // vert, 4 arrêts
  [[10, 10, 14], [40, 40, 80], [90, 60, 140], [180, 140, 210]],      // nuit -> aube violette, 4 arrêts
  [[12, 10, 14], [60, 40, 70], [110, 80, 120], [170, 140, 180]],     // violet, 4 arrêts
  [[10, 14, 12], [35, 70, 55], [70, 130, 100], [140, 190, 160]],     // jade, 4 arrêts
  [[14, 10, 8], [70, 40, 25], [140, 80, 40], [200, 150, 90]],        // terre cuite, 4 arrêts
  [[8, 10, 14], [30, 45, 65], [55, 90, 120], [110, 150, 190]],       // bleu acier, 4 arrêts
  [[10, 10, 10], [60, 60, 60], [130, 130, 130], [200, 200, 200]],    // niveaux de gris, 4 arrêts
  [[8, 8, 10], [30, 40, 60], [50, 90, 110], [90, 150, 160], [180, 220, 210]], // teal, 5 arrêts
  [[10, 8, 8], [50, 25, 20], [100, 50, 30], [150, 90, 40], [200, 140, 70], [230, 200, 140]], // braise -> sable, 6 arrêts
  [[10, 8, 8], [90, 20, 20], [200, 60, 50]],                         // noir -> rouge cramoisi
  [[14, 12, 6], [110, 90, 20], [220, 190, 60]],                      // sombre -> moutarde
  [[14, 8, 10], [100, 40, 60], [220, 130, 160]],                     // sombre -> rose
  [[10, 8, 6], [70, 45, 25], [150, 100, 60]],                        // chocolat monochrome
  [[12, 10, 8], [90, 70, 45], [190, 160, 110]],                      // sépia chaud
  [[8, 10, 14], [60, 90, 120], [180, 220, 240]],                     // bleu glacé
  [[10, 12, 8], [50, 55, 25], [110, 120, 60]],                       // vert marécage
  [[16, 12, 8], [120, 90, 50], [80, 190, 180]],                      // désert -> turquoise (complémentaires)
  [[10, 10, 14], [40, 70, 110], [220, 120, 40]],                     // bleu -> orange (complémentaires)
  [[8, 10, 14], [20, 60, 50], [60, 50, 110], [110, 90, 190]],        // aurore boréale, 4 arrêts
  [[10, 8, 12], [70, 20, 80], [170, 60, 180]],                       // magenta/violet
];

function sampleGradient(stops, v) {
  const n = stops.length;
  const scaled = clamp01(v) * (n - 1);
  const i = Math.min(n - 2, Math.floor(scaled));
  const t = scaled - i;
  const a = stops[i], b = stops[i + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

// si on change ces rampes : relancer outils/extraire_glyphes.py (mêmes caractères)
const RAMPS = [
  " ▖▒▛█",
  " .:-=+*#%@",
  " .·:•○●",
];

// ============================================================
// Choix aléatoire du tirage — renvoie tout ce qu'il faut pour dessiner
// ============================================================

function tirer() {
  const useHeroCombo = Math.random() < 0.15; // option garantie, ~1 tirage sur 7

  let field, palette, ramp, meta;

  if (useHeroCombo) {
    field = makeHeroCombo();
    palette = PALETTES[0]; // bleu-gris -> turquoise, la palette d'origine du hero
    ramp = RAMPS[0];
    meta = { mode: "heroCombo", palette, ramp };
  } else {
    const nLayers = Math.floor(randRange(2, 5)); // 2 à 4 couches
    const layerNames = [];
    const layers = [];
    for (let k = 0; k < nLayers; k++) {
      const entry = pick(FIELD_MAKERS);
      layerNames.push(entry.name);
      layers.push(entry.make());
    }

    // au plus un mode "assombrissant" (min/mul) dans la pile — au-delà, le champ
    // s'effondre vers 0 et le rendu devient quasi vide (constaté à l'usage)
    const DARKENING = ["min", "mul"];
    const modes = [];
    let usedDarkening = false;
    for (let k = 0; k < nLayers - 1; k++) {
      let mode = pick(BLEND_MODES);
      while (usedDarkening && DARKENING.includes(mode)) mode = pick(BLEND_MODES);
      if (DARKENING.includes(mode)) usedDarkening = true;
      modes.push(mode);
    }

    field = stackLayers(layers, modes);
    const useBanding = Math.random() < 0.5;
    const nBands = Math.floor(randRange(4, 10));
    if (useBanding) field = makeBanded(field, nBands);

    palette = pick(PALETTES);
    ramp = pick(RAMPS);

    meta = {
      mode: "layers",
      layers: layerNames,
      blendModes: modes,
      banding: useBanding ? nBands : null,
      palette,
      ramp,
    };
  }

  // Sur le PC, l'image est capturée à la 60e image de l'animation :
  // t = startTime + 59 * 0.05. On calcule directement ce même instant.
  const t = randRange(0, 100) + 59 * 0.05;

  return { field, palette, ramp, t, meta, sampleGradient };
}

module.exports = { tirer };
