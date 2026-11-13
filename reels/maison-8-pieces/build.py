"""Assemble le Réel « 3 surprises » : node rendu-calques.js && python3 build.py"""
import json, subprocess
from PIL import Image
S = json.loads(subprocess.check_output(["node","-e","console.log(JSON.stringify(require('./scenes.js')))"]))
FIN, T, FPS = 4.8, 0.5, 30
CX, CY, CW, CH = 70, 380, 940, 960
enc = ["-r",str(FPS),"-c:v","libx264","-crf","18","-preset","medium","-pix_fmt","yuv420p"]
def run(a): subprocess.run(["ffmpeg","-y","-loglevel","error",*a], check=True)
def loop(f, d): return ["-loop","1","-framerate",str(FPS),"-t",str(d),"-i",f]
clips = []
for i, s in enumerate(S):
    D, out, id_ = s["duree"], f"build/clip-{i:02d}.mp4", f"{i:02d}"
    if s["type"] == "carte":
        src = f"photos/{s['photo']}.jpg"; w, h = Image.open(src).size
        if w >= h:
            sc = f"scale=-2:{int(CH*1.12)}"; a, b = (0.2, 0.8) if i % 2 else (0.8, 0.2)
            x, y = f"(iw-{CW})*({a}+({b}-{a})*t/{D})", f"(ih-{CH})/2"
        else:
            sc = f"scale={int(CW*1.12)}:-2"; x, y = f"(iw-{CW})/2", f"(ih-{CH})*(0.25+0.4*t/{D})"
        fc = (f"[1]{sc},crop={CW}:{CH}:x='{x}':y='{y}',format=rgba[ph];[2]format=gray[m];[ph][m]alphamerge[pr];"
              f"[0][pr]overlay={CX}:{CY}[a];[3]format=rgba,fade=in:st=0.3:d=0.5:alpha=1[t];"
              f"[a][t]overlay=0:'if(lt(t,0.3),40,if(lt(t,0.8),40*(0.8-t)/0.5,0))',format=yuv420p[v]")
        run([*loop("build/fond.png",D),*loop(src,D),*loop("build/masque.png",D),*loop(f"build/texte-{id_}.png",D),
             "-filter_complex",fc,"-map","[v]",*enc,out])
    else:  # check-list : les coches apparaissent une à une
        n = len(s["items"]); steps = [1.0]*(n-1) + [D-(n-1)*1.0]; ins, fc = [], ""
        for k, d in enumerate(steps): ins += loop(f"build/liste-{id_}-{k+1}.png", d); fc += f"[{k}]format=yuv420p,setsar=1[s{k}];"
        fc += "".join(f"[s{k}]" for k in range(n)) + f"concat=n={n}:v=1:a=0[v]"
        run([*ins,"-filter_complex",fc,"-map","[v]",*enc,out])
    clips.append((out, D))
run([*loop("build/fin.png",FIN),"-vf","format=yuv420p",*enc,"build/clip-fin.mp4"]); clips.append(("build/clip-fin.mp4", FIN))
types = [s["type"] for s in S] + ["fin"]
ins, fc, cum, prev = [], [], 0, "[0:v]"
for f, _ in clips: ins += ["-i", f]
for k in range(1, len(clips)):
    cum += clips[k-1][1] - T
    tr = "fade" if k == 1 or "carte" not in (types[k-1], types[k]) or types[k] == "fin" else "smoothleft"
    fc.append(f"{prev}[{k}:v]xfade=transition={tr}:duration={T}:offset={cum:.3f}[x{k}]"); prev = f"[x{k}]"
total = cum + clips[-1][1]
run([*ins,"-f","lavfi","-t",f"{total:.3f}","-i","anullsrc=r=44100:cl=stereo","-filter_complex",";".join(fc),
     "-map",prev,"-map",f"{len(clips)}:a","-c:v","libx264","-crf","19","-preset","slow","-pix_fmt","yuv420p",
     "-c:a","aac","-shortest","-movflags","+faststart","reel-maison-8-pieces.mp4"])
print(f"OK — reel-maison-8-pieces.mp4 ({total:.1f} s)")
