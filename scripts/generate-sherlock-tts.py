import os
import json
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

with open('.env', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#'): continue
        if '=' in line:
            k, v = line.split('=', 1)
            os.environ[k] = v

os.environ['REPLICATE_API_TOKEN'] = os.environ.get('REPLICATE_API_KEY', '')

import replicate
import urllib.request

BOOK_PATH = 'public/reader-packs/sherlock-holmes/books/sherlock-holmes-curly-haired.json'
AUDIO_DIR = 'public/reader-packs/sherlock-holmes/audio/sentences'
MANIFEST_PATH = 'public/reader-packs/sherlock-holmes/reader_manifest.json'

VOICE_DESCRIPTION = "A warm, clear female Chinese narrator voice with gentle pacing and natural intonation, perfect for storytelling."

def generate_audio(text, output_path, attempt=1):
    try:
        output = replicate.run(
            "qwen/qwen3-tts",
            input={
                "text": text,
                "voice_description": VOICE_DESCRIPTION,
                "language": "Chinese"
            }
        )
        
        # output is a FileOutput with a URL
        audio_url = str(output)
        urllib.request.urlretrieve(audio_url, output_path)
        return True
    except Exception as e:
        error_str = str(e)
        if '429' in error_str and attempt < 3:
            wait_time = 15 * attempt
            print(f'  Rate limited, waiting {wait_time}s...', file=sys.stderr)
            time.sleep(wait_time)
            return generate_audio(text, output_path, attempt + 1)
        print(f'  Error: {e}', file=sys.stderr)
        return False

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
        
        success = generate_audio(chinese, output_path)
        
        if success and os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            generated += 1
            print(f'  OK ({os.path.getsize(output_path)} bytes)', file=sys.stderr)
        else:
            failed += 1
            if os.path.exists(output_path):
                os.remove(output_path)
        
        # Rate limiting pause every 5 requests
        if (generated + failed) > 0 and (generated + failed) % 5 == 0:
            time.sleep(2)
    
    print(f'\nDone: {generated} generated, {skipped} skipped, {failed} failed', file=sys.stderr)
    
    if failed == 0 or generated > 0:
        with open(MANIFEST_PATH, encoding='utf-8') as f:
            manifest = json.load(f)
        manifest['audioAvailable'] = True
        manifest['synthesizedAudioCount'] = generated + skipped
        with open(MANIFEST_PATH, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)
        print('Updated manifest: audioAvailable=true', file=sys.stderr)

if __name__ == '__main__':
    main()
