#!/data/data/com.termux/files/usr/bin/bash
# Arrête la génération automatique (annule la tâche planifiée).
# Les images déjà générées restent dans historique/.
# Pour relancer : bash setup.sh

JOB_ID=4242 # même numéro que dans setup.sh

termux-job-scheduler --cancel --job-id "$JOB_ID"
echo "Tâches restantes :"
termux-job-scheduler --pending
