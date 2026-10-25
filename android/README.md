# Fond d'écran génératif — Android (Termux)

Version téléphone du générateur textmode du PC (`~/wallpaper-gen/`) : toutes les heures,
une nouvelle image (champs combinés, palettes sobres, glyphes Bescii-Mono) devient le fond
de l'écran d'accueil et de l'écran de verrouillage.

Testé sur le PC (rendu, recette dans le PNG) et sur le téléphone (Honor 400 Smart, 25/10/2026).

## Comment ça marche

| Fichier | Rôle |
|---|---|
| `champs.js` | Tirage au hasard : 2 à 4 champs mélangés, palette, rampe de glyphes. Copie de `sketch.js` du PC. |
| `generer.js` | Dessine une case = un glyphe dans un SVG, le convertit en PNG (`rsvg-convert`), écrit la recette dans le PNG, garde 500 images, applique le fond. |
| `glyphes.json` | Contours des glyphes de Bescii-Mono, extraits par `outils/extraire_glyphes.py`. |
| `tache.sh` | Ce que le planificateur lance toutes les heures. Écrit dans `journal.txt`. |
| `setup.sh` | Installation + planification. |
| `arreter.sh` | Annule la planification. |

Pourquoi pas textmode.js comme sur le PC : il dessine en WebGL dans un navigateur, et il n'y a
pas de navigateur sans écran utilisable dans Termux. Le calcul des champs est repris tel quel,
seul le dessin change (SVG → PNG). Le bruit est le même algorithme que celui de textmode.js.

Réglages en tête de `generer.js` : taille de l'écran (720 × 1610), taille des cases (14 px),
nombre d'images gardées (500), écran de verrouillage oui/non.

## Installation pas à pas

### 1. Les deux applis, depuis F-Droid

- **Termux** (déjà installé).
- **Termux:API** : à installer depuis **F-Droid aussi**. Les deux applis doivent venir de la
  même source (F-Droid avec F-Droid, Play Store avec Play Store), sinon elles ne se parlent pas.

### 2. Réglages Android (sinon Android tue la tâche)

Pour **Termux** et pour **Termux:API**, désactiver l'optimisation de batterie.
Sur un Honor (MagicOS), le chemin ressemble à ceci — les noms exacts des menus peuvent varier
selon la version, **à vérifier sur le téléphone** :

- Paramètres → Applications → Applications → **Termux** → Batterie (ou « Lancement des
  applications ») → passer en **gestion manuelle** et autoriser : lancement automatique,
  lancement secondaire, exécution en arrière-plan.
- Même chose pour **Termux:API**.
- Si le menu existe : Paramètres → Batterie → Plus de paramètres → ne pas mettre Termux en veille.

### 3. Dans Termux

```bash
pkg install -y git
git clone https://github.com/messipte/wallpaper-android.git
cd wallpaper-android/android
bash setup.sh
```

`setup.sh` installe `nodejs`, `librsvg` et `termux-api`, génère un premier fond d'écran
(il doit changer tout de suite), puis planifie la tâche toutes les heures.

Aucune dépendance npm : `generer.js` n'utilise que Node.

## Tester à la main

```bash
cd ~/wallpaper-android/android
node generer.js                    # génère ET applique un fond
node generer.js --sans-appliquer   # génère seulement (image dans historique/)
./tache.sh                         # exactement ce que lance le planificateur
tail journal.txt                   # dernières lignes : OK + recette, ou l'erreur
termux-job-scheduler --pending     # la tâche planifiée est-elle bien là ?
```

Lire la recette d'une image (palette, couches, modes de mélange) :

```bash
pkg install imagemagick
identify -verbose historique/textmode_….png | grep tirage
```

## Arrêter la routine

```bash
cd ~/wallpaper-android/android
bash arreter.sh
```

Les images déjà générées restent dans `historique/`. Pour relancer : `bash setup.sh`.

## Mettre à jour

```bash
cd ~/wallpaper-android
git pull
```

Pas besoin de relancer `setup.sh` : la tâche lance toujours le `tache.sh` du dossier.

## Bon à savoir

- **« Toutes les heures » est approximatif** : Android regroupe les tâches pour économiser
  la batterie (mode veille profonde), un changement peut arriver en retard.
- **Batterie faible** : la tâche ne tourne pas (réglage par défaut de Termux:API, voulu).
- **Réseau** : la génération se fait hors ligne, mais la tâche **ne tourne que si le téléphone
  a une connexion** (Wi-Fi ou données). C'est le réglage par défaut de Termux:API ;
  `--network none` l'éviterait, mais fait planter Termux:API (bug ci-dessous).
- **Bug Termux:API avec `--network none`** : `termux-job-scheduler` plante à l'affichage
  (NullPointerException dans `JobSchedulerAPI.formatJobInfo` : `getRequiredNetwork()` renvoie
  `null`), et `--pending` aussi. La tâche est enregistrée quand même. D'où l'option retirée.
- **Après un redémarrage** : la tâche est gardée (`--persisted true`).
- Si rien ne change : regarder `journal.txt`, puis `termux-job-scheduler --pending`.
  Si `termux-wallpaper` reste bloqué, l'appli Termux:API manque ou ne vient pas de F-Droid.

## Police

Bescii-Mono, © 2025 Damian Vila, licence CC0 1.0 (domaine public) —
https://vilaindustries.com. Fichier d'origine dans `police/`.
