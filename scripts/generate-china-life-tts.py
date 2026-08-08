"""Google Chirp3-HD TTS for the China-life listening content.

Two jobs, both resumable (existing non-empty files are skipped):

  python scripts/generate-china-life-tts.py sentences
      public/seed/china-life-sentences.json -> public/seed/china-life-audio/<id>.mp3
      and <id>-en.mp3, rotating through many voices so the ear meets a
      variety of speakers the way it does on a real phone call.

  python scripts/generate-china-life-tts.py novel
      scripts/china-arrival-tts-plan.json -> public/reader-packs/china-arrival/audio/sentences/
      using the per-speaker voice assigned by build-china-arrival-pack.mjs.

  python scripts/generate-china-life-tts.py both
"""
import base64
import json
import os
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

for _line in open('.env', encoding='utf-8'):
    _line = _line.strip()
    if _line and not _line.startswith('#') and '=' in _line:
        _k, _v = _line.split('=', 1)
        os.environ.setdefault(_k, _v)

API_KEY = os.environ.get('GOOGLE_CLOUD_API_KEY')
if not API_KEY:
    print('GOOGLE_CLOUD_API_KEY missing from .env', file=sys.stderr)
    sys.exit(1)

SENTENCES_PATH = 'public/seed/china-life-sentences.json'
SENTENCE_AUDIO_DIR = 'public/seed/china-life-audio'
NOVEL_PLAN_PATH = 'scripts/china-arrival-tts-plan.json'

CHINESE_VOICES = [
    'cmn-CN-Chirp3-HD-Achernar', 'cmn-CN-Chirp3-HD-Achird',
    'cmn-CN-Chirp3-HD-Algenib', 'cmn-CN-Chirp3-HD-Algieba',
    'cmn-CN-Chirp3-HD-Alnilam', 'cmn-CN-Chirp3-HD-Aoede',
    'cmn-CN-Chirp3-HD-Autonoe', 'cmn-CN-Chirp3-HD-Callirrhoe',
    'cmn-CN-Chirp3-HD-Charon', 'cmn-CN-Chirp3-HD-Despina',
    'cmn-CN-Chirp3-HD-Enceladus', 'cmn-CN-Chirp3-HD-Erinome',
    'cmn-CN-Chirp3-HD-Fenrir', 'cmn-CN-Chirp3-HD-Gacrux',
    'cmn-CN-Chirp3-HD-Iapetus', 'cmn-CN-Chirp3-HD-Kore',
    'cmn-CN-Chirp3-HD-Laomedeia', 'cmn-CN-Chirp3-HD-Leda',
    'cmn-CN-Chirp3-HD-Orus', 'cmn-CN-Chirp3-HD-Puck',
    'cmn-CN-Chirp3-HD-Pulcherrima', 'cmn-CN-Chirp3-HD-Rasalgethi',
    'cmn-CN-Chirp3-HD-Sadachbia', 'cmn-CN-Chirp3-HD-Sadaltager',
    'cmn-CN-Chirp3-HD-Schedar', 'cmn-CN-Chirp3-HD-Sulafat',
    'cmn-CN-Chirp3-HD-Umbriel', 'cmn-CN-Chirp3-HD-Vindemiatrix',
    'cmn-CN-Chirp3-HD-Zephyr', 'cmn-CN-Chirp3-HD-Zubenelgenubi',
]

ENGLISH_VOICES = ['en-US-Neural2-F', 'en-US-Neural2-D', 'en-US-Neural2-C']

WORKERS = 8
_print_lock = threading.Lock()


def log(message):
    with _print_lock:
        print(message, file=sys.stderr, flush=True)


def synthesize(text, voice_name, output_path, rate, attempt=1):
    url = f'https://texttospeech.googleapis.com/v1/text:synthesize?key={API_KEY}'
    payload = {
        'input': {'text': text},
        'voice': {
            'languageCode': 'cmn-CN' if voice_name.startswith('cmn') else 'en-US',
            'name': voice_name,
        },
        'audioConfig': {'audioEncoding': 'MP3', 'speakingRate': rate},
    }
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode('utf-8'), method='POST'
    )
    req.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            audio = json.loads(resp.read().decode('utf-8')).get('audioContent')
        if not audio:
            return False, 'no audioContent'
        data = base64.b64decode(audio)
        tmp_path = f'{output_path}.part'
        with open(tmp_path, 'wb') as handle:
            handle.write(data)
        os.replace(tmp_path, output_path)
        return True, len(data)
    except urllib.error.HTTPError as error:
        body = error.read().decode('utf-8', errors='replace')
        if error.code in (429, 500, 503) and attempt < 4:
            time.sleep(5 * attempt)
            return synthesize(text, voice_name, output_path, rate, attempt + 1)
        return False, f'HTTP {error.code}: {body[:160]}'
    except Exception as error:  # noqa: BLE001 - network layer, any failure is retryable
        if attempt < 4:
            time.sleep(3 * attempt)
            return synthesize(text, voice_name, output_path, rate, attempt + 1)
        return False, str(error)


def has_audio(path):
    return os.path.exists(path) and os.path.getsize(path) > 0


def run_jobs(jobs, label):
    """jobs: list of (text, voice, path, rate). Returns (made, skipped, failures)."""
    pending = [job for job in jobs if not has_audio(job[2])]
    skipped = len(jobs) - len(pending)
    log(f'{label}: {len(jobs)} clips, {skipped} already present, {len(pending)} to generate')

    made = 0
    failures = []
    done = 0

    def worker(job):
        nonlocal made, done
        text, voice, path, rate = job
        ok, result = synthesize(text, voice, path, rate)
        with _print_lock:
            done += 1
            if ok:
                made += 1
            else:
                failures.append((path, result))
            if done % 25 == 0 or not ok:
                status = 'ok' if ok else f'FAILED {result}'
                print(f'  [{done}/{len(pending)}] {os.path.basename(path)} {status}',
                      file=sys.stderr, flush=True)

    if pending:
        with ThreadPoolExecutor(max_workers=WORKERS) as pool:
            list(pool.map(worker, pending))

    log(f'{label}: {made} generated, {skipped} skipped, {len(failures)} failed')
    for path, reason in failures[:10]:
        log(f'    {path}: {reason}')
    return made, skipped, failures


def sentence_jobs():
    with open(SENTENCES_PATH, encoding='utf-8') as handle:
        sentences = json.load(handle)
    os.makedirs(SENTENCE_AUDIO_DIR, exist_ok=True)

    voice_map_path = os.path.join(SENTENCE_AUDIO_DIR, 'voice-map.json')
    voice_map = {}
    if os.path.exists(voice_map_path):
        with open(voice_map_path, encoding='utf-8') as handle:
            voice_map = json.load(handle)

    jobs = []
    for index, sentence in enumerate(sentences):
        key = sentence['word']
        voice_map.setdefault(key, CHINESE_VOICES[index % len(CHINESE_VOICES)])
        jobs.append((
            sentence['chinese'],
            voice_map[key],
            os.path.join(SENTENCE_AUDIO_DIR, f'{key}.mp3'),
            0.95,
        ))
        jobs.append((
            sentence['english'],
            ENGLISH_VOICES[index % len(ENGLISH_VOICES)],
            os.path.join(SENTENCE_AUDIO_DIR, f'{key}-en.mp3'),
            1.0,
        ))

    with open(voice_map_path, 'w', encoding='utf-8') as handle:
        json.dump(voice_map, handle, ensure_ascii=False, indent=2)
    return jobs


def novel_jobs():
    with open(NOVEL_PLAN_PATH, encoding='utf-8') as handle:
        plan = json.load(handle)
    out_dir = os.path.join(plan['packDir'], 'audio', 'sentences')
    os.makedirs(out_dir, exist_ok=True)
    return [
        (clip['text'], clip['voice'], os.path.join(out_dir, f'{clip["id"]}.mp3'), 0.9)
        for clip in plan['clips']
    ]


def main():
    which = sys.argv[1] if len(sys.argv) > 1 else 'both'
    failed = 0
    if which in ('sentences', 'both'):
        failed += len(run_jobs(sentence_jobs(), 'sentence pool')[2])
    if which in ('novel', 'both'):
        failed += len(run_jobs(novel_jobs(), 'novel')[2])
    if failed:
        log(f'{failed} clips still missing — rerun to retry just those.')
        sys.exit(1)
    log('All clips present.')


if __name__ == '__main__':
    main()
