"""Generate one cached Mandarin line using the approved Edge voices."""
import asyncio
import sys
import edge_tts
import aiohttp

async def main():
    text_path, output, voice = sys.argv[1:]
    with open(text_path, encoding='utf-8') as handle:
        text = handle.read()
    # Stay within the caller's 90-second deadline. Empty responses and transient
    # transport failures are safe to retry: only a complete recording is cached.
    for attempt in range(3):
        try:
            speech = edge_tts.Communicate(
                text, voice, rate='-10%', pitch='+0Hz', volume='+0%',
                connect_timeout=8, receive_timeout=20,
            )
            await asyncio.wait_for(speech.save(output), timeout=25)
            return
        except (asyncio.TimeoutError, aiohttp.ClientError, edge_tts.exceptions.NoAudioReceived):
            if attempt == 2:
                raise
            print(f'Edge TTS: transient failure; retry {attempt + 1}/2', file=sys.stderr)
            await asyncio.sleep(2 * (attempt + 1))

if __name__ == '__main__':
    asyncio.run(main())
