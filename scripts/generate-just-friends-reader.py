import argparse
import concurrent.futures
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from pypdf import PdfReader


sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SOURCE = (
    Path.home()
    / "Documents"
    / "LearnChinese"
    / "Chinese Books"
    / "Just Friends Mandarin Companion Graded Readers Breakthrough Level "
    "(Jared Turner  John Pasden) (Z-Library).pdf"
)
OUT_DIR = ROOT / "public" / "reader-packs" / "just-friends"
BOOK_PATH = OUT_DIR / "books" / "just-friends.json"
MANIFEST_PATH = OUT_DIR / "reader_manifest.json"
AUDIO_DIR = OUT_DIR / "audio" / "sentences"
VOICE = os.environ.get("AZURE_SPEECH_VOICE", "zh-CN-XiaochenNeural")
RATE = os.environ.get("AZURE_SPEECH_RATE", "-10%")
CHAPTER_TITLES = [
    "两个好朋友",
    "好看的女生",
    "去书店",
    "很生气",
    "是不是好朋友？",
    "去饭店",
    "吃饭",
    "女朋友？",
    "不是女朋友？",
    "没有男朋友",
    "有话要说",
    "是好朋友？",
]


def parse_args():
    parser = argparse.ArgumentParser(description="Build the Just Friends hosted reader pack.")
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--synthesize", action="store_true")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--limit", type=int)
    return parser.parse_args()


def load_env():
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key, value)


def normalize_page_text(text):
    lines = [line.strip() for line in text.replace("\x00", "").splitlines()]
    return [line for line in lines if line]


def extract_chapters(source):
    reader = PdfReader(str(source))
    chapters = []
    current = None

    # Printed pages 1-40 are PDF pages 13-52.
    for page_index in range(12, 52):
        lines = normalize_page_text(reader.pages[page_index].extract_text() or "")
        if not lines:
            continue

        if (
            len(lines) >= 2
            and lines[0].isdigit()
            and 1 <= int(lines[0]) <= len(CHAPTER_TITLES)
        ):
            chapter_number = int(lines.pop(0))
            title = lines.pop(0)
            expected_title = CHAPTER_TITLES[chapter_number - 1]
            if title != expected_title:
                raise ValueError(
                    f"Chapter {chapter_number} title mismatch: {title!r} != {expected_title!r}"
                )
            current = {"chapter": chapter_number, "title": title, "lines": []}
            chapters.append(current)

        if current is not None:
            current["lines"].extend(lines)

    if len(chapters) != len(CHAPTER_TITLES):
        raise ValueError(f"Expected 12 chapters, found {len(chapters)}.")

    for chapter in chapters:
        text = "".join(chapter.pop("lines"))
        text = re.sub(r"\[\s*\d+\s*\]", "", text)
        text = re.sub(r"\s+", "", text)
        text = text.replace("?", "？").replace(",", "，")
        chapter["sentences"] = split_sentences(text)
        if not chapter["sentences"]:
            raise ValueError(f"Chapter {chapter['chapter']} has no sentences.")
    return chapters


def split_sentences(text):
    sentences = []
    start = 0
    for match in re.finditer(r"[。！？]+(?:[”’」』])?", text):
        end = match.end()
        sentence = text[start:end].strip()
        if sentence:
            sentences.append(sentence)
        start = end
    remainder = text[start:].strip()
    if remainder:
        sentences.append(remainder)
    return sentences


def make_book(chapters):
    stories = []
    for chapter in chapters:
        chapter_number = chapter["chapter"]
        story_id = f"just-friends-ch{chapter_number:02d}"
        sentences = []
        for index, chinese in enumerate(chapter["sentences"], start=1):
            sentence_id = f"{story_id}-s{index:03d}"
            sentences.append(
                {
                    "id": sentence_id,
                    "storyId": story_id,
                    "index": index,
                    "chinese": chinese,
                    "pinyin": "",
                    "english": "",
                    "targetWords": [],
                    "audioClipId": f"reader-sentence:{sentence_id}",
                    "audioFilename": f"audio/sentences/{sentence_id}.mp3",
                    "ssmlFilename": "",
                }
            )
        stories.append(
            {
                "id": story_id,
                "title": chapter["title"],
                "book": 1,
                "chapter": chapter_number,
                "sourceInspiration": f"Just Friends? - Chapter {chapter_number}",
                "newWords": [],
                "sentences": sentences,
            }
        )
    return {
        "id": "just-friends",
        "title": "Just Friends?",
        "book": 1,
        "chapterStart": 1,
        "chapterEnd": len(stories),
        "stories": stories,
    }


def make_manifest(book):
    sentences = flatten_sentences(book)
    audio_count = sum(
        1
        for sentence in sentences
        if (OUT_DIR / sentence["audioFilename"]).exists()
        and (OUT_DIR / sentence["audioFilename"]).stat().st_size > 0
    )
    return {
        "packId": "just-friends",
        "name": "Just Friends?",
        "description": (
            "Mandarin Companion Breakthrough Level - "
            "Just Friends? (我们是朋友吗？)"
        ),
        "createdAt": "2026-06-22T00:00:00.000Z",
        "voice": VOICE,
        "rate": RATE,
        "audioAvailable": audio_count == len(sentences),
        "synthesizedAudioCount": audio_count,
        "storyCount": len(book["stories"]),
        "sentenceCount": len(sentences),
        "books": [
            {
                "id": book["id"],
                "title": book["title"],
                "book": book["book"],
                "chapterStart": book["chapterStart"],
                "chapterEnd": book["chapterEnd"],
                "storyCount": len(book["stories"]),
                "sentenceCount": len(sentences),
                "path": "books/just-friends.json",
            }
        ],
    }


def flatten_sentences(book):
    return [
        sentence
        for story in book["stories"]
        for sentence in story["sentences"]
    ]


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def remove_orphan_audio(book):
    if not AUDIO_DIR.exists():
        return
    expected = {
        Path(sentence["audioFilename"]).name for sentence in flatten_sentences(book)
    }
    for audio_path in AUDIO_DIR.glob("*.mp3"):
        if audio_path.name not in expected:
            audio_path.unlink()


def escape_xml(value):
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def synthesize_sentence(sentence, key, region, force):
    output_path = OUT_DIR / sentence["audioFilename"]
    if output_path.exists() and output_path.stat().st_size > 0 and not force:
        return "skipped", sentence["id"]

    ssml = (
        '<?xml version="1.0" encoding="utf-8"?>'
        '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" '
        'xml:lang="zh-CN">'
        f'<voice name="{escape_xml(VOICE)}">'
        f'<prosody rate="{escape_xml(RATE)}">{escape_xml(sentence["chinese"])}</prosody>'
        "</voice></speak>"
    ).encode("utf-8")
    url = f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1"

    last_error = None
    for attempt in range(1, 5):
        request = urllib.request.Request(
            url,
            data=ssml,
            method="POST",
            headers={
                "Ocp-Apim-Subscription-Key": key,
                "Content-Type": "application/ssml+xml",
                "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
                "User-Agent": "chunky-chinese-just-friends-reader",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                audio = response.read()
            if not audio:
                raise RuntimeError("Azure returned an empty audio response.")
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_bytes(audio)
            return "generated", sentence["id"]
        except (urllib.error.URLError, TimeoutError, RuntimeError) as error:
            last_error = error
            if attempt < 4:
                time.sleep(0.75 * attempt)
    raise RuntimeError(f"{sentence['id']}: {last_error}")


def synthesize_audio(book, force, limit):
    load_env()
    key = os.environ.get("AZURE_SPEECH_KEY")
    region = os.environ.get("AZURE_SPEECH_REGION")
    if not key or not region:
        raise RuntimeError("Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION.")

    sentences = flatten_sentences(book)
    pending = [
        sentence
        for sentence in sentences
        if force
        or not (OUT_DIR / sentence["audioFilename"]).exists()
        or (OUT_DIR / sentence["audioFilename"]).stat().st_size == 0
    ]
    if limit is not None:
        pending = pending[: max(0, limit)]

    counts = {"generated": 0, "skipped": len(sentences) - len(pending)}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        futures = [
            executor.submit(synthesize_sentence, sentence, key, region, force)
            for sentence in pending
        ]
        for completed, future in enumerate(
            concurrent.futures.as_completed(futures), start=1
        ):
            status, sentence_id = future.result()
            counts[status] += 1
            print(f"[{completed}/{len(pending)}] {sentence_id}: {status}")
    print(
        f"Audio complete: {counts['generated']} generated, "
        f"{counts['skipped']} existing."
    )


def main():
    args = parse_args()
    source = args.source.resolve()
    if not source.exists():
        raise FileNotFoundError(f"Book PDF not found: {source}")

    chapters = extract_chapters(source)
    book = make_book(chapters)
    remove_orphan_audio(book)
    write_json(BOOK_PATH, book)
    write_json(MANIFEST_PATH, make_manifest(book))
    print(
        f"Built Just Friends? with {len(book['stories'])} chapters and "
        f"{len(flatten_sentences(book))} sentences."
    )

    if args.synthesize:
        synthesize_audio(book, args.force, args.limit)
        write_json(MANIFEST_PATH, make_manifest(book))


if __name__ == "__main__":
    main()
