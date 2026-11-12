#!/usr/bin/env bash
# Crée un dossier client à partir du modèle.
# Usage : bash outils/nouveau-dossier.sh vendeur NOM Ville
#         bash outils/nouveau-dossier.sh acquereur NOM
set -euo pipefail
cd "$(dirname "$0")/.."
type="${1:-}"; nom="${2:-}"; ville="${3:-}"
if [[ -z "$type" || -z "$nom" ]]; then
  echo "Usage : bash outils/nouveau-dossier.sh vendeur|acquereur NOM [Ville]"; exit 1
fi
nom=$(echo "$nom" | tr '[:lower:]' '[:upper:]' | tr ' ' '-')
case "$type" in
  vendeur)   modele="clients/_MODELE_VENDEUR";   nomdossier="$(date +%Y-%m)_${nom}${ville:+_$ville}_vendeur" ;;
  acquereur) modele="clients/_MODELE_ACQUEREUR"; nomdossier="$(date +%Y-%m)_${nom}${ville:+_$ville}_acquereur" ;;
  *) echo "Type inconnu : $type (vendeur ou acquereur)"; exit 1 ;;
esac
dest="clients/$nomdossier"
[[ -e "$dest" ]] && { echo "Le dossier existe déjà : $dest"; exit 1; }
cp -r "$modele" "$dest"
find "$dest" -name .gitkeep -delete
echo "✅ Dossier créé : $dest"
