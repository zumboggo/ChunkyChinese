"""Generate one cached Mandarin line using the approved Edge voices."""
import asyncio
import sys
import edge_tts

async def main():
    text_path, output, voice = sys.argv[1:]
    with open(text_path, encoding='utf-8') as handle:
        text = handle.read()
    await edge_tts.Communicate(text, voice, rate='-10%', pitch='+0Hz', volume='+0%').save(output)

if __name__ == '__main__':
    asyncio.run(main())
