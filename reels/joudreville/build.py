"""Réel « Avant / Après » : node rendu-calques.js && python3 build.py"""
import json, subprocess
from PIL import Image
S = json.loads(subprocess.check_output(["node","-e","console.log(JSON.stringify(require('./scenes.js')))"]))
FIN, T, FPS = 4.8, 0.5, 30
enc = ["-r",str(FPS),"-c:v","libx264","-crf","18","-preset","medium","-pix_fmt","yuv420p"]
def run(a): subprocess.run(["ffmpeg","-y","-loglevel","error",*a], check=True)
def loop(f, d): return ["-loop","1","-framerate",str(FPS),"-t",str(d),"-i",f]
def base(d): return ["-f","lavfi","-t",str(d),"-i",f"color=c=0x50B1E6:s=1080x1920:r={FPS}"]
def photo(idx, src, W, H, D, sens=1, depart=None, haut=False):
    """Cadrage 'cover' + léger mouvement de caméra dans une zone W×H."""
    w, h = Image.open(src).size
    if w / h >= W / H:
        sc = f"scale=-2:{int(H*1.10)}"; a, b = depart or ((0.15, 0.55) if sens > 0 else (0.55, 0.15))
        x, y = f"(iw-{W})*({a}+({b}-{a})*t/{D})", ("0" if haut else f"(ih-{H})/2")
    else:
        sc = f"scale={int(W*1.10)}:-2"; a, b = depart or (0.3, 0.7); x, y = f"(iw-{W})/2", f"(ih-{H})*({a}+({b}-{a})*t/{D})"
    return f"[{idx}]{sc},crop={W}:{H}:x='{x}':y='{y}',setsar=1"
FADE = "format=rgba,fade=in:st=0.3:d=0.5:alpha=1"
clips = []
for i, s in enumerate(S):
    D, out, id_ = s["duree"], f"build/clip-{i:02d}.mp4", f"{i:02d}"
    t = s["type"]
    if t == "split":
        fc = (f"{photo(1,'photos/'+s['haut']+'.jpg',1080,820,D,1)}[h];{photo(2,'photos/'+s['bas']+'.jpg',1080,780,D,-1,(0.0,0.3))}[b];"
              f"[0][h]overlay=0:0[a];[a][b]overlay=0:1140[a2];[3]{FADE}[c];[a2][c]overlay=0:'if(lt(t,0.3),40,if(lt(t,0.8),40*(0.8-t)/0.5,0))',format=yuv420p[v]")
        run([*base(D),*loop(f"photos/{s['haut']}.jpg",D),*loop(f"photos/{s['bas']}.jpg",D),*loop(f"build/c-{id_}.png",D),"-filter_complex",fc,"-map","[v]",*enc,out])
    elif t == "wipe":
        W = 1.6; da = D/2 + W/2
        for part, src in (("avant", s["avant"]), ("apres", s["apres"])):
            fc = f"{photo(1,'photos/'+src+'.jpg',1080,1920,da,1,(0.2,0.6) if part=='apres' else None, part=='apres')}[p];[0][p]overlay[a];[2]{FADE}[c];[a][c]overlay,format=yuv420p[v]"
            run([*base(da),*loop(f"photos/{src}.jpg",da),*loop(f"build/c-{id_}-{part}.png",da),"-filter_complex",fc,"-map","[v]",*enc,f"build/w-{id_}-{part}.mp4"])
        off = D/2 - W/2
        fc = (f"[0][1]xfade=transition=wipeleft:duration={W}:offset={off:.3f}[x];"
              f"color=c=white:s=10x1920:r={FPS}:d={D}[l];[x][l]overlay=x='1080*(1-(t-{off:.3f})/{W})-5':y=0:enable='between(t,{off:.3f},{off+W:.3f})',format=yuv420p[v]")
        run(["-i",f"build/w-{id_}-avant.mp4","-i",f"build/w-{id_}-apres.mp4","-filter_complex",fc,"-map","[v]",*enc,out])
    elif t == "plein":
        fc = (f"{photo(1,'photos/'+s['photo']+'.jpg',1080,1920,D,1 if i%2 else -1)}[p];[0][p]overlay[a];[2]{FADE}[c];"
              f"[a][c]overlay=x='if(lt(t,0.3),-200,if(lt(t,0.9),-200*(0.9-t)/0.6,0))':y=0,format=yuv420p[v]")
        run([*base(D),*loop(f"photos/{s['photo']}.jpg",D),*loop(f"build/c-{id_}.png",D),"-filter_complex",fc,"-map","[v]",*enc,out])
    elif t == "tags":
        n = len(s["items"]); steps = [0.8] + [0.55]*(n-1); steps.append(D - sum(steps)); ins, fc = [], ""
        for k, d in enumerate(steps): ins += loop(f"build/c-{id_}-{k}.png", d); fc += f"[{k}]format=yuv420p,setsar=1[s{k}];"
        fc += "".join(f"[s{k}]" for k in range(len(steps))) + f"concat=n={len(steps)}:v=1:a=0[v]"
        run([*ins,"-filter_complex",fc,"-map","[v]",*enc,out])
    else:  # final : léger zoom avant
        run([*loop(f"build/c-{id_}.png",D),"-vf","scale=1188:2112,crop=1080:1920:x='54*(1-t/%s)':y='96*(1-t/%s)',format=yuv420p" % (D, D),*enc,out])
    clips.append((out, D, t))
run([*loop("build/fin.png",FIN),"-vf","format=yuv420p",*enc,"build/clip-fin.mp4"]); clips.append(("build/clip-fin.mp4", FIN, "fin"))
ins, fc, cum, prev = [], [], 0, "[0:v]"
for f, *_ in clips: ins += ["-i", f]
for k in range(1, len(clips)):
    cum += clips[k-1][1] - T; a, b = clips[k-1][2], clips[k][2]
    tr = "slideup" if a == b == "plein" else "circleopen" if b == "tags" else "smoothup" if b == "plein" else "fade"
    fc.append(f"{prev}[{k}:v]xfade=transition={tr}:duration={T}:offset={cum:.3f}[x{k}]"); prev = f"[x{k}]"
total = cum + clips[-1][1]
run([*ins,"-f","lavfi","-t",f"{total:.3f}","-i","anullsrc=r=44100:cl=stereo","-filter_complex",";".join(fc),"-map",prev,"-map",f"{len(clips)}:a",
     "-c:v","libx264","-crf","19","-preset","slow","-pix_fmt","yuv420p","-c:a","aac","-shortest","-movflags","+faststart","reel-joudreville.mp4"])
print(f"OK — reel-joudreville.mp4 ({total:.1f} s)")
