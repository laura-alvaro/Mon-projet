#!/usr/bin/env python3
"""
Crée automatiquement un Reel / TikTok vertical (1080x1920) à partir des photos d'un bien :
zoom lent sur chaque photo, fond flouté, fondus enchaînés, titre au début, carte contact à la fin,
musique en option.

Usage :
  python3 outils/video/reel.py DOSSIER_PHOTOS --titre "Maison 5 pièces" --sous-titre "Ville · 320 000 €" \
      --contact "Prénom Nom · IAD France · 06 00 00 00 00" --musique musique.mp3 --sortie reel.mp4

Les photos sont prises dans l'ordre alphabétique : nommez-les 01_facade.jpg, 02_sejour.jpg...
Dépendance : ffmpeg (https://ffmpeg.org — sur Mac : brew install ffmpeg)
"""
import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

W, H, FPS = 1080, 1920, 30
EXT = {".jpg", ".jpeg", ".png", ".webp"}


def police():
    for motif in ("DejaVu Sans:bold", "Arial:bold", "Helvetica:bold", "sans:bold"):
        try:
            f = subprocess.run(["fc-match", "-f", "%{file}", motif], capture_output=True, text=True).stdout.strip()
            if f and Path(f).exists():
                return f
        except FileNotFoundError:
            break
    for f in ("/System/Library/Fonts/Supplemental/Arial Bold.ttf", "C:/Windows/Fonts/arialbd.ttf"):
        if Path(f).exists():
            return f
    return None


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit("Erreur ffmpeg :\n" + r.stderr[-2000:])


def segment(photo, sortie, duree, i):
    """Une photo -> un clip vertical avec fond flouté et zoom lent (alternativement avant/arrière)."""
    frames = int(duree * FPS)
    zoom = f"min(1+0.10*on/{frames},1.10)" if i % 2 == 0 else f"max(1.10-0.10*on/{frames},1.0)"
    filtre = (
        f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=30:3,eq=brightness=-0.06[bg];"
        f"[0:v]scale={W}:{H}:force_original_aspect_ratio=decrease[fg];"
        f"[bg][fg]overlay=(W-w)/2:(H-h)/2,scale={W*2}:{H*2},"
        f"zoompan=z='{zoom}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS},"
        f"format=yuv420p[v]"
    )
    run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-i", str(photo), "-filter_complex", filtre,
         "-map", "[v]", "-frames:v", str(frames), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", str(sortie)])


def main():
    p = argparse.ArgumentParser(description="Reel vertical automatique à partir de photos")
    p.add_argument("photos", help="Dossier contenant les photos (ordre alphabétique)")
    p.add_argument("--sortie", default="reel.mp4")
    p.add_argument("--titre", default="", help='Ex : "Maison 5 pièces avec jardin"')
    p.add_argument("--sous-titre", default="", help='Ex : "Ville · 320 000 €"')
    p.add_argument("--contact", default="", help='Ex : "Prénom Nom · IAD France · 06 ..."')
    p.add_argument("--musique", help="Fichier audio libre de droits (mp3, m4a...)")
    p.add_argument("--duree", type=float, default=2.8, help="Secondes par photo (défaut 2.8)")
    p.add_argument("--max", type=int, default=15, help="Nombre max de photos (défaut 15)")
    a = p.parse_args()

    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg n'est pas installé (Mac : brew install ffmpeg — Windows : winget install ffmpeg)")
    photos = sorted(f for f in Path(a.photos).iterdir() if f.suffix.lower() in EXT and "_masque" not in f.stem)[: a.max]
    if len(photos) < 2:
        sys.exit("Il faut au moins 2 photos.")

    T = 0.5  # durée des fondus
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        clips = []
        for i, ph in enumerate(photos):
            c = tmp / f"seg{i:02d}.mp4"
            print(f"🎞️  {i + 1}/{len(photos)} {ph.name}")
            segment(ph, c, a.duree, i)
            clips.append(c)

        total = len(clips) * a.duree - (len(clips) - 1) * T
        entrees, chaine, prec = [], [], "[0:v]"
        for c in clips:
            entrees += ["-i", str(c)]
        for k in range(1, len(clips)):
            sortie = f"[x{k}]"
            chaine.append(f"{prec}[{k}:v]xfade=transition=fade:duration={T}:offset={k * (a.duree - T):.3f}{sortie}")
            prec = sortie

        # Textes (via fichiers pour éviter les problèmes d'accents / apostrophes)
        f = police()
        textes = []
        if f:
            def txt(contenu, taille, y, debut, fin, boite=True):
                fichier = tmp / f"t{len(textes)}.txt"
                fichier.write_text(contenu, encoding="utf-8")
                opts = (f"drawtext=fontfile='{f}':textfile='{fichier}':fontsize={taille}:fontcolor=white:"
                        f"x=(w-text_w)/2:y={y}:enable='between(t,{debut:.2f},{fin:.2f})'")
                if boite:
                    opts += ":box=1:boxcolor=black@0.45:boxborderw=24"
                textes.append(opts)
            if a.titre:
                txt(a.titre, 58, "h*0.70", 0.3, 3.5)
            if a.sous_titre:
                txt(a.sous_titre, 46, "h*0.70+110", 0.6, 3.5)
            if a.contact:
                txt("Contactez-moi", 64, "h*0.42", total - 2.6, total)
                txt(a.contact, 42, "h*0.42+110", total - 2.6, total)
        elif a.titre or a.contact:
            print("⚠️  Aucune police trouvée : vidéo créée sans texte.")
        fin = f"fade=t=out:st={total - 0.6:.2f}:d=0.6"
        chaine.append(prec + ",".join(textes + [fin]) + "[v]")

        cmd = ["ffmpeg", "-y", "-loglevel", "error", *entrees]
        cartes = ["-map", "[v]"]
        if a.musique:
            cmd += ["-i", a.musique]
            n = len(clips)
            chaine.append(f"[{n}:a]atrim=0:{total:.2f},afade=t=in:d=0.5,afade=t=out:st={total - 1.5:.2f}:d=1.5[a]")
            cartes += ["-map", "[a]", "-c:a", "aac", "-b:a", "192k"]
        cmd += ["-filter_complex", ";".join(chaine), *cartes, "-c:v", "libx264", "-preset", "medium", "-crf", "20",
                "-pix_fmt", "yuv420p", "-r", str(FPS), "-movflags", "+faststart", "-t", f"{total:.2f}", a.sortie]
        Path(a.sortie).parent.mkdir(parents=True, exist_ok=True)
        run(cmd)
    print(f"\n✅ Reel créé : {a.sortie} ({total:.0f} s, {len(photos)} photos)")


if __name__ == "__main__":
    main()
