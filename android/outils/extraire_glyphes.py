# Extrait les contours des glyphes utilisés par les rampes depuis Bescii-Mono.woff
# et les écrit dans glyphes.json (chemins SVG en unités de police).
#
# Pourquoi : rsvg-convert dessine ces chemins directement, sans avoir à trouver la
# police dans le système (fontconfig). Rien à installer côté police sur le téléphone.
#
# À lancer sur un ordinateur, seulement si on change de police ou de rampes :
#   python3 outils/extraire_glyphes.py
# (nécessite fontTools : pip install fonttools)

import json
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

ICI = Path(__file__).resolve().parent.parent
# même liste que RAMPES dans champs.js (l'espace n'a pas de contour)
CARACTERES = " ▖▒▛█" + " .:-=+*#%@" + " .·:•○●"

police = TTFont(ICI / "police" / "Bescii-Mono.woff")
cmap = police.getBestCmap()
jeu = police.getGlyphSet()

glyphes = {}
for c in sorted(set(CARACTERES) - {" "}):
    stylo = SVGPathPen(jeu)
    jeu[cmap[ord(c)]].draw(stylo)
    glyphes[c] = stylo.getCommands()

sortie = {
    "unitesParEm": police["head"].unitsPerEm,  # 1024 : chasse = 1 em
    "ascendante": police["hhea"].ascent,       # 896 : ligne de base depuis le haut de la case
    "glyphes": glyphes,
}
(ICI / "glyphes.json").write_text(json.dumps(sortie, ensure_ascii=False, indent=1), encoding="utf-8")
print(len(glyphes), "glyphes écrits dans glyphes.json")
