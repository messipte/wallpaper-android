#!/data/data/com.termux/files/usr/bin/bash
# Script lancé toutes les heures par termux-job-scheduler (voir setup.sh).
#
# La première ligne pointe vers le bash de Termux : le planificateur exécute
# ce fichier directement, il doit donc savoir quel programme le lit.
# Ce fichier doit être exécutable (chmod +x, fait par setup.sh).

# dossier où se trouve ce script, quel que soit l'endroit d'où il est lancé
cd "$(dirname "$(realpath "$0")")" || exit 1

# Verrou : une seule exécution à la fois.
# Le planificateur lance parfois ce script deux fois dans la même seconde ;
# les deux exécutions produisaient alors le même nom de fichier et se gênaient
# (ENOENT sur le SVG effacé par l'autre, rotation du journal en concurrence).
# exec 9> ouvre le fichier "verrou" sur le descripteur 9 pour toute la durée du script ;
# flock -n tente de le verrouiller sans attendre : s'il est déjà pris, on sort sans rien dire.
# Le verrou se libère tout seul à la fin du script (même en cas d'erreur).
exec 9> verrou
flock -n 9 || exit 0

# chaque lancement ajoute une ligne (ou une erreur) au journal
node generer.js >> journal.txt 2>&1

# le journal ne garde que les 500 dernières lignes
tail -n 500 journal.txt > journal.tmp && mv journal.tmp journal.txt
