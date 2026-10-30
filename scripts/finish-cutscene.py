#!/usr/bin/env python3
"""Offline cutscene finishing. Never submits predictions or makes paid API calls."""
import argparse, array, hashlib, json, math, os, re, shutil, subprocess, wave
from pathlib import Path


def normalize_speech(text):
    """Conservative English integer normalization; retain every other word."""
    units=dict(zip('zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(),range(20)))
    tens=dict(zip('twenty thirty forty fifty sixty seventy eighty ninety'.split(),range(20,100,10)))
    words=re.findall(r"[a-z]+|[0-9]+",text.lower());out=[];i=0
    while i<len(words):
        word=words[i]
        if word in tens:
            value=tens[word]
            if i+1<len(words) and words[i+1] in units and 0<units[words[i+1]]<10:i+=1;value+=units[words[i]]
            out.append(str(value))
        elif word in units:out.append(str(units[word]))
        else:out.append(word)
        i+=1
    return ' '.join(out)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source',required=True,type=Path)
    p.add_argument('--output',required=True,type=Path)
    p.add_argument('--ffmpeg',default=os.environ.get('FFMPEG_PATH'))
    p.add_argument('--hold-seconds',type=float,default=3)
    p.add_argument('--motion-seconds',type=float,default=6)
    p.add_argument('--audio-end',type=float,help='Explicit clean-speech endpoint; never guessed automatically.')
    p.add_argument('--total-seconds',type=float,help='Optional total length; remaining frames hold the final reaction.')
    p.add_argument('--dialogue',default='')
    p.add_argument('--speech-model',help='Optional single local ASR pass; model must already be cached.')
    p.add_argument('--speech-cache',type=Path)
    p.add_argument('--overwrite',action='store_true')
    a=p.parse_args()
    if a.speech_model and not a.dialogue:p.error('--speech-model requires --dialogue.')
    if not a.source.is_file():p.error('Source must be a saved generated video.')
    if a.source.resolve()==a.output.resolve():p.error('Keep the native source intact; choose a separate output.')
    if a.output.exists() and not a.overwrite:p.error('Output exists; use a new name or --overwrite.')
    if not 0<=a.hold_seconds<=4:p.error('Use a hold from 0 to 4 seconds.')
    for value in [a.motion_seconds,a.audio_end,a.total_seconds]:
        if value is not None and (not math.isfinite(value) or not 0<value<=30):p.error('Durations must be positive and at most 30 seconds.')
    ff=a.ffmpeg or shutil.which('ffmpeg')
    if not ff:
        try:
            import imageio_ffmpeg
            ff=imageio_ffmpeg.get_ffmpeg_exe()
        except ImportError:p.error('Provide --ffmpeg, FFMPEG_PATH, or an installed imageio-ffmpeg runtime.')
    def run(args,data=None):
        r=subprocess.run([ff,'-hide_banner','-y',*args],input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        if r.returncode:raise RuntimeError(r.stderr.decode(errors='replace')[-3000:])
        return r
    fps=24;frame_bytes=854*480*3//2
    decode=['-v','error','-i',str(a.source),'-an','-vf','scale=854:480:force_original_aspect_ratio=decrease,pad=854:480:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24']
    if a.motion_seconds is not None:decode+=['-frames:v',str(round(a.motion_seconds*fps))]
    else:decode+=['-t','30']
    frames=run([*decode,'-pix_fmt','yuv420p','-f','rawvideo','-']).stdout
    if not frames or len(frames)%frame_bytes:raise RuntimeError('Could not decode complete video frames.')
    motion=len(frames)//frame_bytes;hold=round(a.hold_seconds*fps)
    total=round(a.total_seconds*fps) if a.total_seconds is not None else hold+motion
    if total<hold+motion or total>30*fps:p.error('Total must fit the hold and motion, within 30 seconds.')
    tail=total-hold-motion;duration=total/fps;audio_end=a.audio_end or motion/fps
    if audio_end>motion/fps+.05:p.error('Audio endpoint extends beyond the selected motion.')
    audio_filter=f'atrim=duration={audio_end},loudnorm=I=-18:TP=-2:LRA=7'
    if a.audio_end is not None:audio_filter+=f',afade=t=out:st={max(0,audio_end-.3)}:d={min(.3,audio_end)}'
    clean=run(['-v','error','-i',str(a.source),'-vn','-af',audio_filter,'-ar','48000','-ac','2','-f','s16le','-']).stdout
    pcm=(bytes(hold*48000*4//fps)+clean[:round(audio_end*48000)*4]).ljust(total*48000*4//fps,b'\0')[:total*48000*4//fps]
    a.output.parent.mkdir(parents=True,exist_ok=True)
    soundtrack=a.output.with_suffix('.soundtrack.wav')
    with wave.open(str(soundtrack),'wb') as w:
        w.setnchannels(2);w.setsampwidth(2);w.setframerate(48000);w.writeframes(pcm)
    # Literal frames and PCM samples keep the hold and speech synchronized.
    sequence=frames[:frame_bytes]*hold+frames+frames[-frame_bytes:]*tail
    run(['-v','error','-f','rawvideo','-pix_fmt','yuv420p','-s:v','854x480','-r',str(fps),'-i','pipe:0','-i',str(soundtrack),'-map','0:v:0','-map','1:a:0','-t',str(duration),'-c:v','libx264','-preset','medium','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-ar','48000','-ac','2','-b:a','128k','-movflags','+faststart',str(a.output)],sequence)
    # Decode the actual delivery, not just the intermediate PCM.
    sound=run(['-v','error','-i',str(a.output),'-vn','-ac','1','-ar','8000','-f','f32le','-']).stdout
    samples=array.array('f');samples.frombytes(sound)
    rms=lambda data:math.sqrt(sum(x*x for x in data)/max(1,len(data)))
    if abs(len(samples)/8000-duration)>.15:raise RuntimeError('Decoded soundtrack duration differs from delivery.')
    if rms(samples)<1e-6:raise RuntimeError('Delivery audio is silent.')
    if hold and rms(samples[:int(max(0,hold/fps-.05)*8000)])>1e-5:raise RuntimeError('Sound starts during the thinking hold.')
    def gray(t):return run(['-v','error','-ss',str(t),'-i',str(a.output),'-frames:v','1','-pix_fmt','gray','-f','rawvideo','-']).stdout
    hold_diff=None
    if hold:
        first,near_end=gray(0),gray(max(0,hold/fps-.15))
        if len(first)!=len(near_end) or not first:raise RuntimeError('Hold check could not decode frames.')
        hold_diff=sum(abs(x-y) for x,y in zip(first,near_end))/len(first)
        if hold_diff>2:raise RuntimeError('The opening picture moves during the requested still hold.')
    for label,t in [('poster',0),('motion',hold/fps+motion/fps/2),('end',max(0,duration-.1))]:
        run(['-v','error','-ss',str(t),'-i',str(a.output),'-frames:v','1','-q:v','2',str(a.output.with_suffix('.'+label+'.jpg'))])
    report={'source':str(a.source.resolve()),'output':str(a.output.resolve()),'dimensions':[854,480],'fps':fps,'hold_seconds':hold/fps,'motion_seconds':motion/fps,'reaction_hold_seconds':tail/fps,'total_seconds':duration,'decoded_audio_seconds':len(samples)/8000,'audio_non_silent':True,'audio_starts_after_hold':True,'hold_mean_pixel_difference':hold_diff,'sha256':hashlib.sha256(a.output.read_bytes()).hexdigest(),'expected_dialogue':a.dialogue,'speech_check':'not run','review':'One visual/listening review remains; automated checks do not prove natural acting or lip sync.'}
    if a.speech_model:
        from faster_whisper import WhisperModel
        model=WhisperModel(a.speech_model,device='cpu',compute_type='int8',download_root=str(a.speech_cache) if a.speech_cache else None,local_files_only=True)
        segments,_=model.transcribe(str(a.output),language='en',beam_size=5,vad_filter=True)
        transcript=' '.join(s.text.strip() for s in segments)
        report.update(speech_check='pass' if normalize_speech(transcript)==normalize_speech(a.dialogue) else 'review extra/missing words',transcription=transcript)
    report_path=a.output.with_suffix('.checks.json');report_path.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'output':str(a.output),'report':str(report_path),'speech_check':report['speech_check'],'total_seconds':duration}))
    if report['speech_check'].startswith('review'):raise SystemExit(2)

if __name__=='__main__':main()
