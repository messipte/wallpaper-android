#!/data/data/com.termux/files/usr/bin/bash
# Script lancé toutes les heures par termux-job-scheduler (voir setup.sh).
#
# La première ligne pointe vers le bash de Termux : le planificateur exécute
# ce fichier directement, il doit donc savoir quel programme le lit.
# Ce fichier doit être exécutable (chmod +x, fait par setup.sh).

# dossier où se trouve ce script, quel que soit l'endroit d'où il est lancé
cd "$(dirname "$(realpath "$0")")" || exit 1

# chaque lancement ajoute une ligne (ou une erreur) au journal
node generer.js >> journal.txt 2>&1

# le journal ne garde que les 500 dernières lignes
tail -n 500 journal.txt > journal.tmp && mv journal.tmp journal.txt
