#!/data/data/com.termux/files/usr/bin/bash
# Installation dans Termux : paquets, puis planification toutes les heures.
# Lancement : bash setup.sh   (depuis le dossier android/)
#
# Peut être relancé sans risque : la tâche porte un numéro fixe (JOB_ID),
# la relancer remplace l'ancienne au lieu d'en ajouter une deuxième.

set -e # arrêter au premier échec

JOB_ID=4242                  # numéro de la tâche (le même dans arreter.sh)
PERIODE_MS=$((60 * 60 * 1000)) # 1 heure en millisecondes

cd "$(dirname "$(realpath "$0")")"

echo "== 1. Paquets Termux"
pkg update -y
# nodejs : exécute generer.js
# librsvg : fournit rsvg-convert (SVG → PNG)
# termux-api : commandes termux-wallpaper et termux-job-scheduler
#              (il faut AUSSI l'appli Termux:API, voir README)
# util-linux : fournit flock (verrou de tache.sh)
pkg install -y nodejs librsvg termux-api util-linux

for cmd in node rsvg-convert termux-wallpaper termux-job-scheduler flock; do
  command -v "$cmd" >/dev/null || { echo "Commande introuvable : $cmd"; exit 1; }
done

# Pas de dépendances npm : generer.js n'utilise que Node lui-même.

echo "== 2. Droits d'exécution"
chmod +x tache.sh arreter.sh

echo "== 3. Premier fond d'écran (test)"
./tache.sh
tail -n 1 journal.txt

echo "== 4. Planification toutes les heures"
# Pas de --network none : avec cette option, Termux:API plante en affichant la tâche
#   (NullPointerException dans JobSchedulerAPI.formatJobInfo, getRequiredNetwork() = null),
#   et --pending plante aussi. Constaté sur le téléphone le 25/10/2026.
#   Réseau "any" par défaut → la tâche ne tourne que si le téléphone a une connexion.
# --persisted true : la tâche survit au redémarrage du téléphone
# --battery-not-low : laissé par défaut (true) → pas de génération quand la batterie est faible
termux-job-scheduler \
  --job-id "$JOB_ID" \
  --script "$PWD/tache.sh" \
  --period-ms "$PERIODE_MS" \
  --persisted true

echo
echo "Tâche planifiée. Pour la voir :   termux-job-scheduler --pending"
echo "Pour l'arrêter :                  bash arreter.sh"
