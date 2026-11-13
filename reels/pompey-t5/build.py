"""Assemble le Réel : python3 build.py  (après node rendu-overlays.js)"""
import json, subprocess, re
from PIL import Image
scenes = json.loads(subprocess.check_output(["node", "-e", "console.log(JSON.stringify(require('./scenes.js')))"]))
FIN, T, FPS = 3.6, 0.35, 30
clips = []
for i, s in enumerate(scenes):
    D = s["duree"]; src = f"photos/{s['photo']}.jpg"; w, h = Image.open(src).size
    if w / h >= 1:   # paysage / carré : panoramique horizontal
        sc = "scale=-2:1920"; a, b = (0.25, 0.75) if i % 2 == 0 else (0.75, 0.25)
        x = f"(iw-1080)*({a}+({b}-{a})*t/{D})"; y = "0"
    else:            # portrait : léger travelling diagonal
        sc = "scale=-2:2080"; x = f"(iw-1080)*(0.2+0.6*t/{D})"; y = f"(ih-1920)*(0.7-0.5*t/{D})"
    out = f"build/clip-{i:02d}.mp4"
    fc = (f"[0]{sc},crop=1080:1920:x='{x}':y='{y}',setsar=1[bg];"
          f"[1]format=rgba,fade=in:st=0.2:d=0.45:alpha=1[ov];"
          f"[bg][ov]overlay=0:'if(lt(t,0.2),70,if(lt(t,0.65),70*(0.65-t)/0.45,0))',format=yuv420p[v]")
    subprocess.run(["ffmpeg","-y","-loglevel","error","-loop","1","-framerate",str(FPS),"-t",str(D),"-i",src,
        "-loop","1","-framerate",str(FPS),"-t",str(D),"-i",f"build/overlay-{i:02d}.png",
        "-filter_complex",fc,"-map","[v]","-r",str(FPS),"-c:v","libx264","-crf","18","-preset","medium",out], check=True)
    clips.append((out, D))
# Carte de fin (légère entrée en zoom)
subprocess.run(["ffmpeg","-y","-loglevel","error","-loop","1","-framerate",str(FPS),"-t",str(FIN),"-i","build/fin.png",
    "-vf","scale=1080:1920,format=yuv420p","-r",str(FPS),"-c:v","libx264","-crf","18","build/clip-fin.mp4"], check=True)
clips.append(("build/clip-fin.mp4", FIN))
# Enchaînement avec fondus
inputs, fc, cum, prev = [], [], 0, "[0:v]"
for f, _ in clips: inputs += ["-i", f]
for k in range(1, len(clips)):
    cum += clips[k-1][1] - T
    lab = f"[x{k}]"; fc.append(f"{prev}[{k}:v]xfade=transition=fade:duration={T}:offset={cum:.3f}{lab}"); prev = lab
total = cum + clips[-1][1]
subprocess.run(["ffmpeg","-y","-loglevel","error",*inputs,"-f","lavfi","-t",f"{total:.3f}","-i","anullsrc=r=44100:cl=stereo",
    "-filter_complex",";".join(fc),"-map",prev,"-map",f"{len(clips)}:a","-c:v","libx264","-crf","19","-preset","slow",
    "-pix_fmt","yuv420p","-c:a","aac","-shortest","-movflags","+faststart","reel-pompey-t5.mp4"], check=True)
print(f"OK — reel-pompey-t5.mp4 ({total:.1f} s)")
