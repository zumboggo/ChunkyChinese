"""Validate approved pixel frames and pack a bounded streaming resource. Requires Pillow.
Input: {character, palette:[#RRGGBB x <=5], animations:{emotion:[{file,ms},...]}}.
Paths resolve beside the manifest. No quantization or resizing is done silently.
"""
import argparse, hashlib, json, struct
from pathlib import Path
from PIL import Image
EMOTIONS = ('idle','surprised','thinking','talking','happy','worried')
MAX_RESOURCE = 16384  # provisional per-character ceiling, including metadata

def encode(path, palette):
    with Image.open(path) as source:
        if source.size != (32,32): raise ValueError(f'{path}: expected exactly 32x32')
        pixels = list(source.convert('RGBA').getdata())
    rows = bytearray(512)
    for y in range(32):
        for x in range(32):
            r,g,b,a = pixels[y*32+x]
            if a not in (0,255): raise ValueError(f'{path}: partial alpha')
            index=0
            if a:
                try:index=palette.index((r,g,b))+1
                except ValueError:raise ValueError(f'{path}: color outside character palette')
            rows[y*16+x//2] |= index << (4 if x%2==0 else 0)
    return bytes(rows)

def decode(frame,palette):
    pixels=[]
    for y in range(32):
        for x in range(32):
            index=(frame[y*16+x//2] >> (4 if x%2==0 else 0)) & 15
            pixels.append((*palette[index-1],255) if index else (0,0,0,0))
    image=Image.new('RGBA',(32,32));image.putdata(pixels);return image

def pack(manifest_path, output):
    manifest_path=Path(manifest_path);m=json.loads(manifest_path.read_text())
    if set(m['animations'])!=set(EMOTIONS): raise ValueError('Exactly six named emotions required')
    palette=[]
    for color in m['palette']:
        if len(color)!=7 or not color.startswith('#'): raise ValueError('Use #RRGGBB colors')
        rgb=tuple(int(color[i:i+2],16) for i in (1,3,5))
        if any(c%85 for c in rgb): raise ValueError('Palette must use Pebble RGB levels 0,85,170,255')
        palette.append(rgb)
    if not 1<=len(palette)<=5 or len(set(palette))!=len(palette): raise ValueError('1–5 unique visible colors required')
    frames=[];indices={};sequences=[];paths=[]
    for emotion in EMOTIONS:
        sequence=[]
        entries=m['animations'][emotion]
        if not 2<=len(entries)<=4: raise ValueError(f'{emotion}: require 2–4 frames')
        for entry in entries:
            duration=entry['ms']
            if type(duration) is not int or not 160<=duration<=2000: raise ValueError('Frame duration must be 160–2000 ms')
            path=(manifest_path.parent/entry['file']).resolve()
            if not path.is_relative_to(manifest_path.parent.resolve()): raise ValueError('Frame must be within asset directory')
            data=encode(path,palette)
            if data not in indices: indices[data]=len(frames);frames.append(data)
            sequence.append((indices[data],duration));paths.append(path)
        sequences.append(sequence)
    # 16-byte header, six fixed 14-byte descriptors, then 512-byte indexed frames.
    colors=[0xc0|(r//85<<4)|(g//85<<2)|(b//85) for r,g,b in palette]
    header=b'PX32'+bytes([2,len(frames),len(palette),6])+bytes(colors+[0]*(8-len(colors)))
    descriptors=bytearray()
    for sequence in sequences:
        descriptors.extend(bytes([len(sequence),0]))  # mode 0 = finite playback, hold last
        for i in range(4): descriptors.extend(struct.pack('<BH',*(sequence[i] if i<len(sequence) else (0,0))))
    blob=header+descriptors+b''.join(frames)
    if len(blob)>MAX_RESOURCE: raise ValueError('Character exceeds provisional 16 KiB resource ceiling')
    output=Path(output);output.mkdir(parents=True,exist_ok=True)
    (output/'character.px32').write_bytes(blob)
    previews=output/'previews';previews.mkdir(exist_ok=True)
    sheet=Image.new('RGBA',(32*4,32*6),(255,255,255,255))
    for row,(emotion,sequence) in enumerate(zip(EMOTIONS,sequences)):
        images=[decode(frames[index],palette) for index,_ in sequence]
        for col,image in enumerate(images):sheet.alpha_composite(image,(32*col,32*row))
        # Full-canvas GIF frames avoid transparent-delta artifacts. No loop extension.
        gifs=[]
        for image in images:
            bg=Image.new('RGB',(32,32),'white');bg.paste(image,mask=image.getchannel('A'));gifs.append(bg)
        gifs[0].save(previews/(emotion+'.gif'),save_all=True,append_images=gifs[1:],duration=[ms for _,ms in sequence],disposal=2)
    sheet.save(output/'contact-native.png');sheet.resize((768,1152),Image.Resampling.NEAREST).save(output/'contact-enlarged.png')
    # Compare static per-pixel patches against first frame; descriptor/runtime overhead excluded.
    base=list(decode(frames[0],palette).getdata());patch_bytes=512
    for frame in frames[1:]:patch_bytes+=sum(a!=b for a,b in zip(base,decode(frame,palette).getdata()))*3
    report={'character':m['character'],'sourceFrameCount':len(paths),'uniqueFrames':len(frames),
      'resourceBytes':len(blob),'metadataBytes':100,'bytesPerFrame':512,'rowScratchBytes':16,
      'fullFramePixelBytesAt4bpp':512*len(frames),'estimatedBasePlusPixelPatchBytes':patch_bytes,
      'format':'4-bit indices with transparent index 0; identical frames deduplicated',
      'choice':'Fixed rows bound decoding work and support a 16-byte read buffer. Patch estimate excludes indices and runtime costs; evaluate visually before choosing overlays.',
      'sha256':hashlib.sha256(blob).hexdigest(),'measuredReaderPeakHeap':None,'measuredDrawTimeMs':None,
      'verification':'Asset storage measured; row buffer is a design requirement, not a runtime measurement. Native integration and emulator benchmarks pending visual review.'}
    (output/'report.json').write_text(json.dumps(report,indent=2)+'\n');return report

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('manifest');parser.add_argument('output');args=parser.parse_args()
    print(json.dumps(pack(args.manifest,args.output),indent=2))
