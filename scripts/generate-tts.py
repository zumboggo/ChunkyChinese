import os
import json
from pathlib import Path
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Load .env manually
with open('.env', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#'): continue
        if '=' in line:
            k, v = line.split('=', 1)
            os.environ[k] = v

import azure.cognitiveservices.speech as speechsdk

speech_key = os.environ.get("AZURE_SPEECH_KEY")
speech_region = os.environ.get("AZURE_SPEECH_REGION")

if not speech_key or not speech_region:
    print("Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION")
    exit(1)

speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=speech_region)
speech_config.set_speech_synthesis_output_format(speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3)
speech_config.speech_synthesis_voice_name = "zh-CN-XiaoxiaoNeural"

sentences_file = Path("public/seed/lms-sentences.json")
output_dir = Path("public/audio/sentences")
output_dir.mkdir(parents=True, exist_ok=True)

with open(sentences_file, "r", encoding="utf-8") as f:
    sentences = json.load(f)

print("Synthesizing up to 100 clips...")
limit = min(len(sentences), 100)
for i in range(limit):
    sentence = sentences[i]
    word = sentence["word"]
    chinese = sentence["chinese"]
    
    import urllib.parse
    safe_word = urllib.parse.quote(word)
    audio_path = output_dir / f"{safe_word}.mp3"
    
    if audio_path.exists() and audio_path.stat().st_size > 0:
        print(f"[{i+1}] skip: {word}")
        continue
        
    audio_config = speechsdk.audio.AudioOutputConfig(filename=str(audio_path))
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)
    
    result = synthesizer.speak_text_async(chinese).get()
    
    if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
        print(f"[{i+1}] synthesized: {word}")
    else:
        print(f"[{i+1}] failed: {word}")
        if result.reason == speechsdk.ResultReason.Canceled:
            details = result.cancellation_details
            print(f"reason: {details.reason}")
            if details.reason == speechsdk.CancellationReason.Error:
                print(f"details: {details.error_details}")
        exit(1)

print("Done.")
