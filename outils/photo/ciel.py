#!/usr/bin/env python3
"""
Retouche automatique de photos immobilières :
  - remplace un ciel gris / blanc / terne par un ciel bleu (ou doré)
  - éclaircit, ajoute du contraste, des couleurs et un peu de chaleur
  - supprime les données GPS (EXIF) pour protéger l'adresse du vendeur

Usage :
  python3 outils/photo/ciel.py DOSSIER_OU_PHOTO -o DOSSIER_SORTIE [options]

Exemples :
  python3 outils/photo/ciel.py a-traiter/photos -o a-traiter/photos/retouchees
  python3 outils/photo/ciel.py interieur/ -o sortie/ --sans-ciel
  python3 outils/photo/ciel.py facade.jpg -o sortie/ --ciel coucher --masque

Dépendances : pip install pillow numpy  (et pillow-heif pour les photos iPhone .HEIC)
"""
import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageOps

try:  # Photos iPhone (.heic) si pillow-heif est installé
    from pillow_heif import register_heif_opener
    register_heif_opener()
    HEIC = True
except ImportError:
    HEIC = False

EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"} | ({".heic", ".heif"} if HEIC else set())

# Couleurs (R, G, B) du haut du ciel vers l'horizon
CIELS = {
    "bleu":    [(40, 110, 200), (95, 160, 225), (185, 218, 245)],
    "clair":   [(95, 155, 220), (150, 195, 238), (215, 233, 250)],
    "coucher": [(60, 85, 160), (215, 140, 120), (250, 200, 140)],
}


def to_np(img):
    return np.asarray(img, dtype=np.float32) / 255.0


def to_img(arr):
    return Image.fromarray((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8))


def masque_ciel(img, seuil=0.55, hauteur_max=0.75):
    """Masque (0..1) du ciel : zone claire, peu saturée ou bleutée, reliée au bord haut de l'image."""
    w, h = img.size
    echelle = 480 / max(w, h)
    petit = img.resize((max(1, int(w * echelle)), max(1, int(h * echelle))), Image.BILINEAR)
    a = to_np(petit.filter(ImageFilter.GaussianBlur(1.5)))
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    vmax, vmin = a.max(-1), a.min(-1)
    sat = (vmax - vmin) / (vmax + 1e-6)
    gris_blanc = (vmax > seuil) & (sat < 0.22)
    bleute = (b > r + 0.03) & (b >= g - 0.02) & (vmax > seuil - 0.15) & (sat < 0.65)
    vegetation = (g > r + 0.02) & (g > b + 0.02)
    candidat = (gris_blanc | bleute) & ~vegetation

    # Nettoyage du bruit puis : le ciel part du haut et descend tant que ça « ressemble à du ciel »
    m = Image.fromarray((candidat * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(5))
    candidat = np.asarray(m) > 127
    ph = candidat.shape[0]
    candidat[int(ph * hauteur_max):, :] = False
    relie_haut = np.cumprod(candidat, axis=0).astype(bool)

    # Rattrape les morceaux de ciel cachés (sous un avant-toit, entre les branches) :
    # extension de proche en proche, seulement vers des pixels de la MÊME couleur que le ciel
    if relie_haut.sum() > 50:
        ref = np.median(a[relie_haut], axis=0)
        proche = candidat & (np.linalg.norm(a - ref, axis=-1) < 0.08)
        for _ in range(80):
            voisin = np.asarray(Image.fromarray((relie_haut * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))) > 127
            nouveau = relie_haut | (voisin & proche)
            if (nouveau == relie_haut).all():
                break
            relie_haut = nouveau

    # Lissage horizontal de la ligne d'horizon (évite les « dents de scie »)
    mask = Image.fromarray((relie_haut * 255).astype(np.uint8))
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    mask = mask.resize((w, h), Image.BILINEAR).filter(ImageFilter.GaussianBlur(max(2, w / 600)))
    return np.asarray(mask, dtype=np.float32) / 255.0


def bruit_nuages(w, h, graine):
    """Nuages doux et discrets (bruit multi-échelles)."""
    rng = np.random.default_rng(graine)
    total = np.zeros((h, w), np.float32)
    for taille, poids in ((4, 0.5), (8, 0.3), (16, 0.2)):
        petit = rng.random((taille, max(2, int(taille * w / h)))).astype(np.float32)
        couche = Image.fromarray((petit * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
        total += poids * np.asarray(couche, np.float32) / 255.0
    nuages = np.clip((total - 0.55) * 3.0, 0, 1)
    return np.asarray(to_img(nuages).filter(ImageFilter.GaussianBlur(w / 150)), np.float32) / 255.0


def nouveau_ciel(w, h, horizon, preset, nuages, graine):
    stops = np.array(CIELS[preset], np.float32) / 255.0
    y = np.clip(np.arange(h, dtype=np.float32) / max(horizon, 1), 0, 1)
    pos = np.linspace(0, 1, len(stops))
    grad = np.stack([np.interp(y, pos, stops[:, c]) for c in range(3)], -1)
    ciel = np.broadcast_to(grad[:, None, :], (h, w, 3)).copy()
    if nuages > 0:
        n = bruit_nuages(w, h, graine)[..., None] * nuages
        ciel = ciel * (1 - n) + 0.97 * n
    return ciel


def ameliorer(a, lumiere, contraste, saturation, chaleur):
    """Luminosité automatique + réglages. a : tableau HxWx3 entre 0 et 1."""
    lum = a @ np.array([0.299, 0.587, 0.114], np.float32)
    mediane = float(np.median(lum))
    gamma = np.clip(np.log(0.5) / np.log(max(mediane, 0.05)), 0.6, 1.0)  # n'éclaircit que si trop sombre
    a = np.power(np.clip(a, 0, 1), gamma) * lumiere
    a = (a - 0.5) * contraste + 0.5
    gris = (a @ np.array([0.299, 0.587, 0.114], np.float32))[..., None]
    a = gris + (a - gris) * saturation
    a[..., 0] += chaleur
    a[..., 2] -= chaleur
    return np.clip(a, 0, 1)


def traiter(chemin, sortie, args):
    img = ImageOps.exif_transpose(Image.open(chemin)).convert("RGB")
    w, h = img.size
    a = to_np(img)
    a_amelioree = ameliorer(a, args.lumiere, args.contraste, args.saturation, args.chaleur)
    info = "lumière"

    if not args.sans_ciel:
        m = masque_ciel(img, args.seuil)
        couverture = float((m > 0.5).mean())
        if couverture >= 0.03:
            profondeur = (m > 0.5).sum(0)
            horizon = int(np.percentile(profondeur[profondeur > 0], 90)) if (profondeur > 0).any() else h // 3
            ciel = nouveau_ciel(w, h, horizon, args.ciel, args.nuages, graine=hash(chemin.name) % 2**32)
            # On garde un peu du relief des vrais nuages
            lum = a @ np.array([0.299, 0.587, 0.114], np.float32)
            # flou calculé uniquement sur le ciel (évite un halo clair autour des toits)
            rayon = w / 80
            flou_l = np.asarray(to_img(lum * m).filter(ImageFilter.GaussianBlur(rayon)), np.float32) / 255.0
            flou_m = np.asarray(to_img(m).filter(ImageFilter.GaussianBlur(rayon)), np.float32) / 255.0
            detail = np.where(flou_m > 0.05, lum - flou_l / np.maximum(flou_m, 0.05), 0) * m
            ciel = np.clip(ciel + detail[..., None] * 0.6, 0, 1)
            mm = m[..., None]
            a_amelioree = a_amelioree * (1 - mm) + ciel * mm
            info = f"ciel {args.ciel} ({couverture:.0%} de l'image) + lumière"
            if args.masque:
                to_img(np.repeat(mm, 3, -1)).save(sortie.with_name(sortie.stem + "_masque.png"))
        else:
            info = "pas de ciel détecté → lumière seulement"

    res = to_img(a_amelioree)
    if sortie.suffix.lower() in (".jpg", ".jpeg"):
        res.save(sortie, quality=92, optimize=True, subsampling=0)  # sans EXIF/GPS
    else:
        res.save(sortie)
    return info


def main():
    p = argparse.ArgumentParser(description="Ciel bleu + photos lumineuses pour annonces immobilières")
    p.add_argument("entree", help="Photo ou dossier de photos")
    p.add_argument("-o", "--sortie", required=True, help="Dossier de sortie")
    p.add_argument("--ciel", choices=CIELS.keys(), default="bleu", help="Style de ciel (défaut : bleu)")
    p.add_argument("--sans-ciel", action="store_true", help="Ne pas toucher au ciel (photos intérieures)")
    p.add_argument("--nuages", type=float, default=0.35, help="Quantité de petits nuages 0 à 1 (défaut 0.35)")
    p.add_argument("--seuil", type=float, default=0.55, help="Détection du ciel : plus haut = plus strict (défaut 0.55)")
    p.add_argument("--lumiere", type=float, default=1.05, help="Luminosité (défaut 1.05)")
    p.add_argument("--contraste", type=float, default=1.08, help="Contraste (défaut 1.08)")
    p.add_argument("--saturation", type=float, default=1.15, help="Couleurs (défaut 1.15)")
    p.add_argument("--chaleur", type=float, default=0.02, help="Chaleur, négatif = plus froid (défaut 0.02)")
    p.add_argument("--masque", action="store_true", help="Enregistre aussi le masque du ciel détecté (contrôle)")
    args = p.parse_args()

    entree, sortie = Path(args.entree), Path(args.sortie)
    photos = [entree] if entree.is_file() else sorted(f for f in entree.iterdir() if f.suffix.lower() in EXTENSIONS)
    if not photos:
        sys.exit(f"Aucune photo trouvée dans {entree}" + ("" if HEIC else " (pour les .HEIC : pip install pillow-heif)"))
    sortie.mkdir(parents=True, exist_ok=True)
    for f in photos:
        cible = sortie / (f.stem + (".jpg" if f.suffix.lower() in (".heic", ".heif") else f.suffix))
        try:
            print(f"✅ {f.name} : {traiter(f, cible, args)}")
        except Exception as e:  # une photo défectueuse ne bloque pas les autres
            print(f"❌ {f.name} : {e}")
    print(f"\nPhotos retouchées dans : {sortie}")


if __name__ == "__main__":
    main()
