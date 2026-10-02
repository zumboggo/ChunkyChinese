"""Render private pilot WAVs with installed macOS voices (no API or upload).

Usage: python scripts/render-listening-pilot.py PRIVATE_OUTPUT_DIRECTORY
Run prepare-listening-pilot.mjs first. These are timing prototypes, not production voices.
"""
import hashlib
import html
import json
import subprocess
import sys
import wave
from pathlib import Path

RATE = 22050
VOICES = {'zh': 'Tingting', 'en': 'Samantha'}
SPEEDS = {'zh': 170, 'en': 165}


def main():
    directory = Path(sys.argv[1]).resolve()
    public = Path(__file__).resolve().parents[1] / 'public'
    if directory == public or public in directory.parents:
        raise ValueError('Private recordings must not be placed in public/')
    cache = directory / 'clips'
    cache.mkdir(parents=True, exist_ok=True)
    reports, sections = [], []
    for source in sorted(directory.glob('listening-*.json')):
        lesson = json.loads(source.read_text())
        if 'steps' not in lesson:
            continue
        frames, segments, elapsed, clip_seconds = [], [], 0, {}
        for step in lesson['steps']:
            if step['kind'] == 'pause':
                audio = b'\0\0' * round(step['seconds'] * RATE)
            else:
                language = step['language']
                key = hashlib.sha256(json.dumps([VOICES[language], SPEEDS[language], step['text']], ensure_ascii=False).encode()).hexdigest()[:24]
                clip = cache / f'{key}.wav'
                if not clip.exists():
                    subprocess.run(['say', '-v', VOICES[language], '-r', str(SPEEDS[language]), '-o', str(clip), '--data-format=LEI16@22050', step['text']], check=True, timeout=30)
                with wave.open(str(clip), 'rb') as reader:
                    if reader.getnchannels() != 1 or reader.getsampwidth() != 2 or reader.getframerate() != RATE or reader.getnframes() == 0:
                        raise ValueError(f'Invalid or empty speech clip: {clip}')
                    audio = reader.readframes(reader.getnframes())
                clip_seconds[step['id']] = len(audio) / (RATE * 2)
            duration = len(audio) / (RATE * 2)
            segments.append({**step, 'startSeconds': elapsed, 'durationSeconds': duration})
            elapsed += duration
            frames.append(audio)
        target = directory / f"{lesson['id']}.wav"
        with wave.open(str(target), 'wb') as writer:
            writer.setnchannels(1); writer.setsampwidth(2); writer.setframerate(RATE)
            writer.writeframes(b''.join(frames))
        report = {'id': lesson['id'], 'title': lesson['title'], 'seconds': round(elapsed, 3), 'withinTarget': 210 <= elapsed <= 270, 'voiceQuality': 'local macOS timing prototype', 'clipSeconds': clip_seconds}
        reports.append(report)
        (directory / f"{lesson['id']}-timing.local.json").write_text(json.dumps({'report': report, 'segments': segments}, ensure_ascii=False, indent=2))
        transcript = '\n'.join(f"<li><small>{int(s['startSeconds'])//60}:{int(s['startSeconds'])%60:02d} · {html.escape(s['phase'])}</small> {html.escape(s.get('text', ''))}</li>" for s in segments if s['kind'] == 'speech')
        focus = ' · '.join(f"{f['zh']} — {f['en']}" for f in lesson['focus'])
        sections.append(f'<section><h2>{html.escape(lesson["title"])}</h2><p>{html.escape(focus)}</p><p>{elapsed/60:.2f} minutes · {"Within target" if report["withinTarget"] else "Needs timing adjustment"}</p><audio controls preload="metadata" src="{target.name}"></audio><details><summary>Timed script</summary><ol>{transcript}</ol></details></section>')
        print(f"{lesson['id']}: {elapsed:.1f}s ({'PASS' if report['withinTarget'] else 'ADJUST'})", flush=True)
    (directory / 'timing-report.local.json').write_text(json.dumps(reports, ensure_ascii=False, indent=2))
    (directory / 'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Listening pilot</title><style>body{font:18px/1.6 system-ui;max-width:850px;margin:40px auto;padding:0 20px;background:#f8f5ef;color:#25352d}section{background:white;padding:24px;margin:24px 0;border-radius:18px}audio{width:100%}small{color:#68756e}li{margin:12px 0}h1,h2{line-height:1.2}</style><h1>Five short listening lessons</h1><p>Private pilot · target 3:30–4:30 · local synthetic voices for timing review. Listening does not change your word ratings. Both Chinese dialogue roles currently use the same preview voice.</p>' + ''.join(sections) + '</html>')
    if not reports or not all(r['withinTarget'] for r in reports):
        sys.exit(1)


if __name__ == '__main__':
    main()
