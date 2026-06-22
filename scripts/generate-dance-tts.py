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
BOOK_PATH = 'public/reader-packs/can-i-dance/books/can-i-dance-with-you.json'
AUDIO_DIR = 'public/reader-packs/can-i-dance/audio/sentences'
MANIFEST_PATH = 'public/reader-packs/can-i-dance/reader_manifest.json'

VOICE_CONFIG = {
    'languageCode': 'cmn-CN',
    'name': 'cmn-CN-Chirp3-HD-Aoede',
}

def synthesize(text, output_path, attempt=1):
    url = f'https://texttospeech.googleapis.com/v1/text:synthesize?key={API_KEY}'
    payload = {
        'input': {'text': text},
        'voice': VOICE_CONFIG,
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
            print(f'  Rate limited, waiting {wait_time}s...', file=sys.stderr)
            time.sleep(wait_time)
            return synthesize(text, output_path, attempt + 1)
        return False, f'HTTP {e.code}: {error_body[:150]}'
    except Exception as e:
        return False, str(e)

def main():
    with open(BOOK_PATH, encoding='utf-8') as f:
        book = json.load(f)

    os.makedirs(AUDIO_DIR, exist_ok=True)

    all_sentences = []
    for story in book['stories']:
        for sent in story['sentences']:
            all_sentences.append(sent)

    print(f'Total sentences: {len(all_sentences)}', file=sys.stderr)

    generated = 0
    skipped = 0
    failed = 0

    for i, sent in enumerate(all_sentences):
        sent_id = sent['id']
        chinese = sent['chinese']
        output_path = os.path.join(AUDIO_DIR, f'{sent_id}.mp3')

        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            skipped += 1
            continue

        print(f'[{i+1}/{len(all_sentences)}] {chinese[:50]}...', file=sys.stderr)

        success, result = synthesize(chinese, output_path)

        if success and os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            generated += 1
            print(f'  OK ({result} bytes)', file=sys.stderr)
        else:
            failed += 1
            if os.path.exists(output_path):
                os.remove(output_path)
            print(f'  FAILED: {result}', file=sys.stderr)

        # Small delay between requests
        if (generated + failed) % 10 == 0 and (generated + failed) > 0:
            time.sleep(1)

    print(f'\nDone: {generated} generated, {skipped} skipped, {failed} failed', file=sys.stderr)

    # Update manifest
    if generated > 0 or skipped > 0:
        with open(MANIFEST_PATH, encoding='utf-8') as f:
            manifest = json.load(f)
        manifest['audioAvailable'] = True
        manifest['synthesizedAudioCount'] = generated + skipped
        manifest['voice'] = 'cmn-CN-Chirp3-HD-Aoede'
        with open(MANIFEST_PATH, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)
        print('Updated manifest: audioAvailable=true', file=sys.stderr)

if __name__ == '__main__':
    main()
