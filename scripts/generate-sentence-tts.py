import os
import sys
import json
import base64
import time
import urllib.request
import urllib.error

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

with open('.env', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#'): continue
        if '=' in line:
            k, v = line.split('=', 1)
            os.environ[k] = v

API_KEY = os.environ.get('GOOGLE_CLOUD_API_KEY')
SENTENCES_PATH = 'public/seed/lms-sentences.json'
OUTPUT_DIR = 'public/seed/sentence-audio'
VOICE_MAP_PATH = os.path.join(OUTPUT_DIR, 'voice-map.json')

CHINESE_VOICES = [
    'cmn-CN-Chirp3-HD-Achernar',
    'cmn-CN-Chirp3-HD-Aoede',
    'cmn-CN-Chirp3-HD-Autonoe',
    'cmn-CN-Chirp3-HD-Callirrhoe',
    'cmn-CN-Chirp3-HD-Despina',
    'cmn-CN-Chirp3-HD-Erinome',
    'cmn-CN-Chirp3-HD-Gacrux',
    'cmn-CN-Chirp3-HD-Kore',
    'cmn-CN-Chirp3-HD-Laomedeia',
    'cmn-CN-Chirp3-HD-Leda',
    'cmn-CN-Chirp3-HD-Pulcherrima',
    'cmn-CN-Chirp3-HD-Sulafat',
    'cmn-CN-Chirp3-HD-Vindemiatrix',
    'cmn-CN-Chirp3-HD-Zephyr',
]

ENGLISH_VOICE = 'en-US-Neural2-F'

def synthesize(text, voice_name, output_path, attempt=1):
    url = f'https://texttospeech.googleapis.com/v1/text:synthesize?key={API_KEY}'
    payload = {
        'input': {'text': text},
        'voice': {'languageCode': 'cmn-CN' if 'cmn' in voice_name else 'en-US', 'name': voice_name},
        'audioConfig': {'audioEncoding': 'MP3', 'speakingRate': 0.95},
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, method='POST')
    req.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            audio_content = result.get('audioContent')
            if audio_content:
                audio_bytes = base64.b64decode(audio_content)
                with open(output_path, 'wb') as f:
                    f.write(audio_bytes)
                return True, len(audio_bytes)
            return False, 'No audioContent'
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8', errors='replace')
        if e.code == 429 and attempt < 3:
            wait_time = 10 * attempt
            print(f'    Rate limited, waiting {wait_time}s...', file=sys.stderr)
            time.sleep(wait_time)
            return synthesize(text, voice_name, output_path, attempt + 1)
        return False, f'HTTP {e.code}: {error_body[:150]}'
    except Exception as e:
        return False, str(e)

def main():
    with open(SENTENCES_PATH, encoding='utf-8') as f:
        sentences = json.load(f)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Load existing voice map or create new
    voice_map = {}
    if os.path.exists(VOICE_MAP_PATH):
        with open(VOICE_MAP_PATH, encoding='utf-8') as f:
            voice_map = json.load(f)

    # Assign voices
    for i, sent in enumerate(sentences):
        word = sent['word']
        if word not in voice_map:
            voice_map[word] = CHINESE_VOICES[i % len(CHINESE_VOICES)]

    # Save voice map
    with open(VOICE_MAP_PATH, 'w', encoding='utf-8') as f:
        json.dump(voice_map, f, ensure_ascii=False, indent=2)

    total = len(sentences)
    print(f'Total sentences: {total}', file=sys.stderr)

    generated_cn = 0
    generated_en = 0
    skipped_cn = 0
    skipped_en = 0
    failed = 0

    for i, sent in enumerate(sentences):
        word = sent['word']
        chinese = sent['chinese']
        english = sent['english']
        voice = voice_map[word]

        cn_path = os.path.join(OUTPUT_DIR, f'{word}.mp3')
        en_path = os.path.join(OUTPUT_DIR, f'{word}-en.mp3')

        # Chinese audio
        if os.path.exists(cn_path) and os.path.getsize(cn_path) > 0:
            skipped_cn += 1
        else:
            print(f'[{i+1}/{total}] CN: {chinese[:40]}...', file=sys.stderr)
            ok, result = synthesize(chinese, voice, cn_path)
            if ok:
                generated_cn += 1
                print(f'  OK ({result} bytes)', file=sys.stderr)
            else:
                failed += 1
                print(f'  FAILED: {result}', file=sys.stderr)
                if os.path.exists(cn_path):
                    os.remove(cn_path)

        # English audio
        if os.path.exists(en_path) and os.path.getsize(en_path) > 0:
            skipped_en += 1
        else:
            print(f'[{i+1}/{total}] EN: {english[:40]}...', file=sys.stderr)
            ok, result = synthesize(english, ENGLISH_VOICE, en_path)
            if ok:
                generated_en += 1
                print(f'  OK ({result} bytes)', file=sys.stderr)
            else:
                failed += 1
                print(f'  FAILED: {result}', file=sys.stderr)
                if os.path.exists(en_path):
                    os.remove(en_path)

        # Rate limit pause every 10 requests
        if (generated_cn + generated_en + failed) > 0 and (generated_cn + generated_en + failed) % 10 == 0:
            time.sleep(1)

    print(f'\nDone:', file=sys.stderr)
    print(f'  Chinese: {generated_cn} generated, {skipped_cn} skipped', file=sys.stderr)
    print(f'  English: {generated_en} generated, {skipped_en} skipped', file=sys.stderr)
    print(f'  Failed: {failed}', file=sys.stderr)

if __name__ == '__main__':
    main()
