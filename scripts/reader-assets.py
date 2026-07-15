#!/usr/bin/env python3
"""Audit and generate reader-pack audio and artwork.

Examples:
  python scripts/reader-assets.py audit
  python scripts/reader-assets.py generate-audio --pack can-i-dance --pack john-gospel
  python scripts/reader-assets.py generate-audio --pack sherlock-holmes --replace
  python scripts/reader-assets.py generate-art --only covers
  python scripts/reader-assets.py verify
"""

from __future__ import annotations

import argparse
import base64
import concurrent.futures
import json
import os
import shutil
import re
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
PACK_ROOT = ROOT / "public" / "reader-packs"
ART_PLAN_PATH = ROOT / "scripts" / "reader-art-plan.json"
VOICE = "cmn-CN-Chirp3-HD-Aoede"
SPEAKING_RATE = 0.85


def load_dotenv() -> None:
    for path in (ROOT / ".env", ROOT / ".env.local"):
        if not path.exists():
            continue
        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key, value)


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)


def is_valid_mp3(path: Path) -> bool:
    if not path.exists() or path.stat().st_size < 300:
        return False
    prefix = path.read_bytes()[:3]
    return prefix == b"ID3" or (len(prefix) >= 2 and prefix[0] == 0xFF and prefix[1] & 0xE0 == 0xE0)


@dataclass(frozen=True)
class SentenceJob:
    pack_id: str
    sentence_id: str
    chinese: str
    relative_audio_path: str
    destination: Path


@dataclass
class PackData:
    pack_id: str
    root: Path
    manifest_path: Path
    manifest: dict[str, Any]
    books: list[dict[str, Any]]
    sentences: list[dict[str, Any]]


def discover_packs(selected: set[str] | None = None) -> list[PackData]:
    packs: list[PackData] = []
    for manifest_path in sorted(PACK_ROOT.glob("*/reader_manifest.json")):
        manifest = read_json(manifest_path)
        pack_id = manifest.get("packId") or manifest_path.parent.name
        if selected and pack_id not in selected:
            continue
        books: list[dict[str, Any]] = []
        sentences: list[dict[str, Any]] = []
        for summary in manifest.get("books", []):
            book_path = manifest_path.parent / summary["path"]
            book = read_json(book_path)
            books.append(book)
            for story in book.get("stories", []):
                sentences.extend(story.get("sentences", []))
        packs.append(
            PackData(
                pack_id=pack_id,
                root=manifest_path.parent,
                manifest_path=manifest_path,
                manifest=manifest,
                books=books,
                sentences=sentences,
            )
        )
    return packs


def sentence_audio_path(pack: PackData, sentence: dict[str, Any]) -> Path:
    relative = sentence.get("audioFilename") or f"audio/sentences/{sentence['id']}.mp3"
    return pack.root / relative


def audit_rows(packs: Iterable[PackData]) -> list[dict[str, Any]]:
    rows = []
    for pack in packs:
        valid = 0
        missing: list[str] = []
        invalid: list[str] = []
        for sentence in pack.sentences:
            path = sentence_audio_path(pack, sentence)
            if not path.exists():
                missing.append(sentence["id"])
            elif not is_valid_mp3(path):
                invalid.append(sentence["id"])
            else:
                valid += 1
        cover_count = sum(
            1
            for summary in pack.manifest.get("books", [])
            if summary.get("coverImage") and (pack.root / summary["coverImage"]).exists()
        )
        rows.append(
            {
                "packId": pack.pack_id,
                "books": len(pack.books),
                "sentences": len(pack.sentences),
                "validAudio": valid,
                "missingAudio": len(missing),
                "invalidAudio": len(invalid),
                "covers": cover_count,
                "missingIds": missing,
                "invalidIds": invalid,
            }
        )
    return rows


def normalize_reader_metadata(args: argparse.Namespace) -> None:
    selected = set(args.pack or [])
    packs = discover_packs(selected or None)
    for pack in packs:
        changed_books = 0
        for summary in pack.manifest.get("books", []):
            book_path = pack.root / summary["path"]
            book = read_json(book_path)
            seen_ids: dict[str, int] = {}
            changed = False
            for story in book.get("stories", []):
                for sentence in story.get("sentences", []):
                    base_id = sentence["id"]
                    occurrence = seen_ids.get(base_id, 0) + 1
                    seen_ids[base_id] = occurrence
                    sentence_id = base_id if occurrence == 1 else f"{base_id}-s{occurrence:02d}"
                    if sentence["id"] != sentence_id:
                        sentence["id"] = sentence_id
                        changed = True
                    expected_filename = f"audio/sentences/{sentence_id}.mp3"
                    expected_clip_id = f"reader:{pack.pack_id}:{sentence_id}"
                    if sentence.get("audioFilename") != expected_filename:
                        sentence["audioFilename"] = expected_filename
                        changed = True
                    if sentence.get("audioClipId") != expected_clip_id:
                        sentence["audioClipId"] = expected_clip_id
                        changed = True
            if changed:
                write_json(book_path, book)
                changed_books += 1
        print(f"{pack.pack_id}: normalized {changed_books} book file(s).")


def print_audit(rows: list[dict[str, Any]], verbose: bool = False) -> None:
    for row in rows:
        print(
            f"{row['packId']}: {row['validAudio']}/{row['sentences']} audio, "
            f"{row['missingAudio']} missing, {row['invalidAudio']} invalid, "
            f"{row['covers']}/{row['books']} covers"
        )
        if verbose and row["missingIds"]:
            print("  missing:", ", ".join(row["missingIds"]))
        if verbose and row["invalidIds"]:
            print("  invalid:", ", ".join(row["invalidIds"]))


def request_json(url: str, payload: dict[str, Any], headers: dict[str, str], attempts: int = 5) -> Any:
    encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    for attempt in range(1, attempts + 1):
        request = urllib.request.Request(url, data=encoded, method="POST")
        request.add_header("Content-Type", "application/json")
        for key, value in headers.items():
            request.add_header(key, value)
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            body = error.read().decode("utf-8", errors="replace")
            retryable = error.code in {408, 429, 500, 502, 503, 504}
            if not retryable or attempt == attempts:
                raise RuntimeError(f"HTTP {error.code}: {body[:600]}") from error
        except (TimeoutError, urllib.error.URLError) as error:
            if attempt == attempts:
                raise RuntimeError(str(error)) from error
        time.sleep(min(30, 2 ** attempt))
    raise RuntimeError("Request failed")


def synthesize(job: SentenceJob, api_key: str, output: Path) -> int:
    segments = tts_segments(job.chinese)
    output.parent.mkdir(parents=True, exist_ok=True)
    if len(segments) == 1:
        audio = synthesize_bytes(segments[0], api_key)
        temporary = output.with_suffix(".mp3.tmp")
        temporary.write_bytes(audio)
        if not is_valid_mp3(temporary):
            temporary.unlink(missing_ok=True)
            raise RuntimeError("Google returned an invalid MP3")
        temporary.replace(output)
        return len(audio)

    with tempfile.TemporaryDirectory(prefix="reader-tts-") as temp_dir_name:
        temp_dir = Path(temp_dir_name)
        segment_paths = []
        for index, segment in enumerate(segments):
            segment_path = temp_dir / f"{index:03d}.mp3"
            segment_path.write_bytes(synthesize_bytes(segment, api_key))
            segment_paths.append(segment_path)
        concat_path = temp_dir / "concat.txt"
        concat_path.write_text(
            "".join(f"file '{path.as_posix()}'\n" for path in segment_paths),
            encoding="utf-8",
        )
        combined = temp_dir / "combined.mp3"
        process = subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(concat_path),
                "-c:a",
                "libmp3lame",
                "-b:a",
                "64k",
                "-y",
                str(combined),
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        if process.returncode != 0 or not is_valid_mp3(combined):
            raise RuntimeError(f"ffmpeg could not combine TTS segments: {process.stderr[:300]}")
        temporary = output.with_suffix(".mp3.tmp")
        shutil.copyfile(combined, temporary)
        temporary.replace(output)
        return output.stat().st_size


def synthesize_bytes(text: str, api_key: str) -> bytes:
    payload = {
        "input": {"text": text},
        "voice": {"languageCode": "cmn-CN", "name": VOICE},
        "audioConfig": {
            "audioEncoding": "MP3",
            "speakingRate": SPEAKING_RATE,
        },
    }
    response = request_json(
        f"https://texttospeech.googleapis.com/v1/text:synthesize?key={api_key}",
        payload,
        {},
    )
    return base64.b64decode(response["audioContent"])


def tts_segments(text: str, max_segment_length: int = 18) -> list[str]:
    """Split long Chinese lines into independently synthesized natural clauses."""
    if len(text) <= max_segment_length:
        return [text]
    pieces = [piece for piece in re.split(r"([，,；;：:。！？!?])", text) if piece]
    segments: list[str] = []
    current = ""
    for piece in pieces:
        if piece not in "，,；;：:。！？!?" and len(current) + len(piece) > max_segment_length:
            if current:
                current = current.rstrip("，,；;：:")
                segments.append(current if current.endswith(tuple("。！？!?")) else current + "。")
                current = ""
            while len(piece) > max_segment_length:
                segments.append(piece[:max_segment_length] + "。")
                piece = piece[max_segment_length:]
        current += piece
        is_boundary = piece in "，,；;：:。！？!?"
        if is_boundary and len(current) >= max_segment_length:
            current = current.rstrip("，,；;：:")
            segments.append(current if current.endswith(tuple("。！？!?")) else current + "。")
            current = ""
    if current:
        segments.append(current)
    return segments


def generate_audio(args: argparse.Namespace) -> None:
    api_key = os.environ.get("GOOGLE_CLOUD_API_KEY")
    if not api_key:
        raise SystemExit("GOOGLE_CLOUD_API_KEY is not configured.")
    selected = set(args.pack or [])
    packs = discover_packs(selected or None)
    if not packs:
        raise SystemExit("No matching reader packs.")

    for pack in packs:
        replace = bool(args.replace)
        staging_root = pack.root / ".audio-staging" if replace else pack.root
        jobs: list[SentenceJob] = []
        for sentence in pack.sentences:
            destination = sentence_audio_path(pack, sentence)
            if not replace and is_valid_mp3(destination):
                continue
            relative = destination.relative_to(pack.root).as_posix()
            jobs.append(
                SentenceJob(
                    pack_id=pack.pack_id,
                    sentence_id=sentence["id"],
                    chinese=sentence["chinese"],
                    relative_audio_path=relative,
                    destination=destination,
                )
            )
        print(f"{pack.pack_id}: {len(jobs)} clip(s) queued at rate {SPEAKING_RATE}.")
        if args.dry_run or not jobs:
            continue

        failures: list[tuple[SentenceJob, str]] = []
        completed = 0

        def run(job: SentenceJob) -> tuple[SentenceJob, int]:
            output = staging_root / job.relative_audio_path if replace else job.destination
            return job, synthesize(job, api_key, output)

        with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
            future_map = {executor.submit(run, job): job for job in jobs}
            for future in concurrent.futures.as_completed(future_map):
                job = future_map[future]
                try:
                    _, size = future.result()
                    completed += 1
                    print(f"[{completed}/{len(jobs)}] {pack.pack_id}/{job.sentence_id} ({size} bytes)")
                except Exception as error:  # noqa: BLE001 - command should report all failures
                    failures.append((job, str(error)))
                    print(f"FAILED {pack.pack_id}/{job.sentence_id}: {error}", file=sys.stderr)

        if failures:
            print(f"{pack.pack_id}: {len(failures)} failure(s); existing audio was left intact.", file=sys.stderr)
            continue

        if replace:
            for job in jobs:
                source = staging_root / job.relative_audio_path
                job.destination.parent.mkdir(parents=True, exist_ok=True)
                source.replace(job.destination)
            shutil.rmtree(staging_root, ignore_errors=True)

        valid_count = sum(is_valid_mp3(sentence_audio_path(pack, sentence)) for sentence in pack.sentences)
        pack.manifest["voice"] = VOICE
        pack.manifest["rate"] = str(SPEAKING_RATE)
        pack.manifest["speakingRate"] = SPEAKING_RATE
        pack.manifest["audioAvailable"] = valid_count == len(pack.sentences)
        pack.manifest["synthesizedAudioCount"] = valid_count
        write_json(pack.manifest_path, pack.manifest)
        print(f"{pack.pack_id}: manifest updated ({valid_count}/{len(pack.sentences)} valid clips).")


def find_base64_image(value: Any) -> bytes | None:
    if isinstance(value, dict):
        for key in ("data", "imageBytes", "bytesBase64Encoded"):
            candidate = value.get(key)
            if isinstance(candidate, str) and len(candidate) > 500:
                try:
                    return base64.b64decode(candidate)
                except ValueError:
                    pass
        for child in value.values():
            found = find_base64_image(child)
            if found:
                return found
    elif isinstance(value, list):
        for child in value:
            found = find_base64_image(child)
            if found:
                return found
    return None


def adc_path() -> Path | None:
    configured = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    candidates = [
        Path(configured) if configured else None,
        Path.home() / ".config" / "gcloud" / "application_default_credentials.json",
        Path(os.environ.get("APPDATA", "")) / "gcloud" / "application_default_credentials.json",
    ]
    return next((path for path in candidates if path and path.exists()), None)


def adc_access_token(credentials: dict[str, Any]) -> str:
    token_uri = credentials.get("token_uri") or "https://oauth2.googleapis.com/token"
    payload = urllib.parse.urlencode(
        {
            "client_id": credentials["client_id"],
            "client_secret": credentials["client_secret"],
            "refresh_token": credentials["refresh_token"],
            "grant_type": "refresh_token",
        }
    ).encode("utf-8")
    request = urllib.request.Request(token_uri, data=payload, method="POST")
    request.add_header("Content-Type", "application/x-www-form-urlencoded")
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))["access_token"]


def generate_vertex_image(prompt: str, credentials_path: Path, aspect_ratio: str) -> bytes:
    credentials = read_json(credentials_path)
    project_id = (
        os.environ.get("GOOGLE_CLOUD_PROJECT")
        or os.environ.get("GCLOUD_PROJECT")
        or credentials.get("quota_project_id")
    )
    if not project_id:
        raise RuntimeError("ADC is configured but GOOGLE_CLOUD_PROJECT/quota_project_id is missing")
    location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
    model = os.environ.get("GOOGLE_IMAGE_MODEL", "imagen-4.0-generate-001")
    token = adc_access_token(credentials)
    response = request_json(
        (
            f"https://{location}-aiplatform.googleapis.com/v1/projects/{project_id}/"
            f"locations/{location}/publishers/google/models/{model}:predict"
        ),
        {
            "instances": [{"prompt": prompt}],
            "parameters": {
                "sampleCount": 1,
                "aspectRatio": aspect_ratio,
                "outputOptions": {"mimeType": "image/png"},
                "personGeneration": "allow_adult",
                "addWatermark": False,
            },
        },
        {"Authorization": f"Bearer {token}"},
        attempts=5,
    )
    image = find_base64_image(response)
    if not image:
        raise RuntimeError("Vertex Imagen response did not contain image data")
    return image


def generate_vertex_gemini_image(prompt: str, credentials_path: Path, aspect_ratio: str) -> bytes:
    credentials = read_json(credentials_path)
    project_id = (
        os.environ.get("GOOGLE_CLOUD_PROJECT")
        or os.environ.get("GCLOUD_PROJECT")
        or credentials.get("quota_project_id")
    )
    if not project_id:
        raise RuntimeError("ADC is configured but GOOGLE_CLOUD_PROJECT/quota_project_id is missing")
    location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
    model = os.environ.get("GOOGLE_IMAGE_MODEL", "gemini-2.5-flash-image")
    token = adc_access_token(credentials)
    response = request_json(
        (
            f"https://{location}-aiplatform.googleapis.com/v1/projects/{project_id}/"
            f"locations/{location}/publishers/google/models/{model}:generateContent"
        ),
        {
            "contents": [{"role": "USER", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseModalities": ["TEXT", "IMAGE"],
                "imageConfig": {"aspectRatio": aspect_ratio},
            },
        },
        {"Authorization": f"Bearer {token}"},
        attempts=3,
    )
    image = find_base64_image(response)
    if not image:
        raise RuntimeError("Vertex Gemini response did not contain image data")
    return image


def generate_gemini_image(prompt: str, api_key: str, aspect_ratio: str) -> bytes:
    model = os.environ.get("GOOGLE_GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image")
    payload = {
        "model": model,
        "input": [{"type": "text", "text": prompt}],
        "response_format": {
            "type": "image",
            "mime_type": "image/jpeg",
            "aspect_ratio": aspect_ratio,
            "image_size": "1K",
        },
    }
    response = request_json(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        payload,
        {"x-goog-api-key": api_key},
        attempts=3,
    )
    image = find_base64_image(response)
    if not image:
        raise RuntimeError("Gemini response did not contain image data")
    return image


def process_art_image(source: Path, destination: Path, asset: dict[str, Any]) -> None:
    try:
        from PIL import Image
    except ImportError as error:
        raise RuntimeError("Pillow is required for image processing: pip install pillow") from error

    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        image.load()
        if asset.get("chromaKey"):
            image = image.convert("RGBA")
            pixels = image.load()
            for y in range(image.height):
                for x in range(image.width):
                    red, green, blue, alpha = pixels[x, y]
                    dominance = green - max(red, blue)
                    if green > 110 and dominance > 30:
                        edge = max(0, min(255, int(255 - (dominance - 30) * 4)))
                        pixels[x, y] = (red, min(green, max(red, blue)), blue, min(alpha, edge))
            image.thumbnail((768, 1024), Image.Resampling.LANCZOS)
            image.save(destination, "WEBP", quality=82, method=6, lossless=False)
        else:
            image = image.convert("RGB")
            max_size = (768, 1152) if asset["kind"] == "cover" else (1280, 720)
            image.thumbnail(max_size, Image.Resampling.LANCZOS)
            image.save(destination, "WEBP", quality=82, method=6)


def generate_art(args: argparse.Namespace) -> None:
    backend = os.environ.get("GOOGLE_IMAGE_BACKEND", "auto").lower()
    if backend not in {"auto", "vertex", "gemini"}:
        raise SystemExit("GOOGLE_IMAGE_BACKEND must be auto, vertex, or gemini.")
    credentials_path = adc_path()
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_CLOUD_API_KEY")
    if backend == "gemini":
        credentials_path = None
    if backend == "vertex" and not credentials_path:
        raise SystemExit("GOOGLE_IMAGE_BACKEND=vertex requires Application Default Credentials.")
    if not credentials_path and not api_key:
        raise SystemExit("ADC, GEMINI_API_KEY, or GOOGLE_CLOUD_API_KEY is not configured.")
    plan = read_json(ART_PLAN_PATH)
    assets = plan["assets"]
    if args.only:
        assets = [asset for asset in assets if asset["kind"] in set(args.only)]
    if args.asset:
        assets = [asset for asset in assets if asset["id"] in set(args.asset)]

    for index, asset in enumerate(assets, 1):
        destination = ROOT / asset["output"]
        if destination.exists() and not args.replace:
            print(f"[{index}/{len(assets)}] skip {asset['id']} (exists)")
            continue
        print(f"[{index}/{len(assets)}] generating {asset['id']}")
        if args.dry_run:
            continue
        if credentials_path:
            model = os.environ.get("GOOGLE_IMAGE_MODEL", "imagen-4.0-generate-001")
            if model.startswith("gemini-"):
                image = generate_vertex_gemini_image(asset["prompt"], credentials_path, asset["aspectRatio"])
            else:
                image = generate_vertex_image(asset["prompt"], credentials_path, asset["aspectRatio"])
        else:
            image = generate_gemini_image(asset["prompt"], api_key, asset["aspectRatio"])
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as handle:
            source = Path(handle.name)
            source.write_bytes(image)
        try:
            process_art_image(source, destination, asset)
        finally:
            source.unlink(missing_ok=True)
        print(f"  wrote {destination.relative_to(ROOT)} ({destination.stat().st_size} bytes)")


def install_art(args: argparse.Namespace) -> None:
    plan = read_json(ART_PLAN_PATH)
    asset = next((item for item in plan["assets"] if item["id"] == args.asset), None)
    if not asset:
        raise SystemExit(f"Unknown art asset: {args.asset}")
    source = Path(args.source).resolve()
    if not source.exists():
        raise SystemExit(f"Source image does not exist: {source}")
    destination = ROOT / asset["output"]
    process_art_image(source, destination, asset)
    print(f"Installed {asset['id']} -> {destination.relative_to(ROOT)} ({destination.stat().st_size} bytes)")


def build_just_friends_scene_pilot() -> None:
    pack_root = PACK_ROOT / "just-friends"
    book = read_json(pack_root / "books" / "just-friends.json")
    runtime_root = pack_root / "visual-novels" / "worlds" / "just-friends"
    runtime_prefix = "reader-packs/just-friends/visual-novels/worlds/just-friends"

    backgrounds = {
        "campus-day": "campus-day.webp",
        "bookstore-evening": "bookstore-evening.webp",
        "snack-shop-night": "snack-shop-night.webp",
        "restaurant-night": "restaurant-night.webp",
        "family-home": "family-home.webp",
    }
    sprites = {
        "dapeng-neutral": ("dapeng", "neutral"),
        "dapeng-angry": ("dapeng", "angry"),
        "wendong-neutral": ("wendong", "neutral"),
        "wendong-worried": ("wendong", "worried"),
        "zixin-neutral": ("zixin", "neutral"),
        "zixin-smile": ("zixin", "smile"),
    }
    asset_manifest = {
        "schemaVersion": 1,
        "contentVersion": "2026-06-23-just-friends-pilot-v1",
        "backgrounds": {
            asset_id: {
                "id": asset_id,
                "src": f"{runtime_prefix}/assets/backgrounds/{filename}",
                "width": 1280,
                "height": 720,
                "alt": asset_id.replace("-", " "),
            }
            for asset_id, filename in backgrounds.items()
        },
        "sprites": {
            asset_id: {
                "id": asset_id,
                "characterId": character_id,
                "personaId": "default",
                "outfitId": "campus",
                "poseId": "standing",
                "expressionId": expression,
                "src": f"{runtime_prefix}/assets/characters/{asset_id}.webp",
                "width": 768,
                "height": 1024,
                "anchorX": 0.5,
                "anchorY": 1,
                "defaultScale": 0.78,
                "mobileScale": 0.68,
                "alt": asset_id.replace("-", " "),
            }
            for asset_id, (character_id, expression) in sprites.items()
        },
        "cinematics": {},
        "fallbackBackgroundId": "campus-day",
    }

    cast = {
        "dapeng": {
            "id": "dapeng",
            "displayNames": {"english": "Qian Dapeng", "chinese": "钱大朋"},
            "personas": {
                "default": {
                    "id": "default",
                    "defaultOutfitId": "campus",
                    "defaultSpriteId": "dapeng-neutral",
                    "defaultScale": 0.78,
                    "preferredPositions": ["left", "center"],
                }
            },
        },
        "wendong": {
            "id": "wendong",
            "displayNames": {"english": "Xie Wendong", "chinese": "谢文东"},
            "personas": {
                "default": {
                    "id": "default",
                    "defaultOutfitId": "campus",
                    "defaultSpriteId": "wendong-neutral",
                    "defaultScale": 0.78,
                    "preferredPositions": ["right", "center"],
                }
            },
        },
        "zixin": {
            "id": "zixin",
            "displayNames": {"english": "Zhou Zixin", "chinese": "周子心"},
            "personas": {
                "default": {
                    "id": "default",
                    "defaultOutfitId": "campus",
                    "defaultSpriteId": "zixin-neutral",
                    "defaultScale": 0.78,
                    "preferredPositions": ["center", "right"],
                }
            },
        },
    }

    chapter_scenes = {
        1: ("campus-day", [("dapeng", "dapeng-neutral", "left"), ("wendong", "wendong-neutral", "right")]),
        2: ("campus-day", [("dapeng", "dapeng-neutral", "left"), ("wendong", "wendong-neutral", "right")]),
        3: ("bookstore-evening", [("dapeng", "dapeng-neutral", "left"), ("zixin", "zixin-smile", "right")]),
        4: ("bookstore-evening", [("dapeng", "dapeng-angry", "left"), ("zixin", "zixin-neutral", "right")]),
        5: ("snack-shop-night", [("dapeng", "dapeng-angry", "left"), ("zixin", "zixin-neutral", "right")]),
        6: ("campus-day", [("dapeng", "dapeng-angry", "left"), ("wendong", "wendong-worried", "right")]),
        7: ("restaurant-night", [("wendong", "wendong-neutral", "left"), ("zixin", "zixin-smile", "right")]),
        8: ("restaurant-night", [("dapeng", "dapeng-angry", "left"), ("wendong", "wendong-worried", "center"), ("zixin", "zixin-neutral", "right")]),
        9: ("restaurant-night", [("wendong", "wendong-worried", "left"), ("zixin", "zixin-neutral", "right")]),
        10: ("family-home", [("wendong", "wendong-worried", "left"), ("zixin", "zixin-smile", "right")]),
        11: ("campus-day", [("dapeng", "dapeng-neutral", "left"), ("wendong", "wendong-neutral", "right")]),
        12: ("family-home", [("dapeng", "dapeng-neutral", "left"), ("wendong", "wendong-neutral", "right")]),
    }

    nodes: dict[str, Any] = {}
    ordered_sentences: list[tuple[int, dict[str, Any]]] = []
    for story in book["stories"]:
        for sentence in story["sentences"]:
            ordered_sentences.append((story["chapter"], sentence))

    for index, (chapter, sentence) in enumerate(ordered_sentences):
        node_id = f"jf-{index + 1:03d}"
        next_id = f"jf-{index + 2:03d}" if index + 1 < len(ordered_sentences) else "jf-result"
        node: dict[str, Any] = {
            "id": node_id,
            "type": "line",
            "text": {
                "chinese": sentence["chinese"],
                "english": sentence.get("english"),
                "readerSentenceId": sentence["id"],
            },
            "audioClipId": sentence.get("audioClipId"),
            "nextId": next_id,
        }
        if index == 0 or chapter != ordered_sentences[index - 1][0]:
            background_id, scene_cast = chapter_scenes[chapter]
            node["scene"] = {
                "backgroundId": background_id,
                "characters": [
                    {
                        "characterId": character_id,
                        "personaId": "default",
                        "spriteId": sprite_id,
                        "position": position,
                    }
                    for character_id, sprite_id, position in scene_cast
                ],
            }
        nodes[node_id] = node

    nodes["jf-result"] = {
        "id": "jf-result",
        "type": "questResult",
        "questId": "just-friends-story",
        "outcomeId": "finished",
        "completed": True,
        "resultId": "just-friends-finished",
        "summary": {
            "chinese": "故事读完了。钱大朋和谢文东终于说出了真正想说的话。",
            "english": "Story complete. Qian Dapeng and Xie Wendong finally said what they truly meant.",
        },
        "worldEffects": [
            {"id": "finished-story", "op": "setFlag", "key": "just-friends-finished", "value": True}
        ],
        "returnLocationId": "campus",
    }

    script = {
        "schemaVersion": 1,
        "contentVersion": "2026-06-23-just-friends-pilot-v1",
        "id": "just-friends-story",
        "packId": "just-friends",
        "title": "Just Friends?",
        "description": "The complete graded reader staged with reusable backgrounds and character expressions.",
        "initialNodeId": "jf-001",
        "assetManifestPath": f"{runtime_prefix}/asset-manifest.json",
        "characters": cast,
        "initialState": {"money": 0, "skills": {}, "flags": {}, "questNotes": {}, "appliedOnceKeys": []},
        "nodes": nodes,
    }

    world = {
        "id": "just-friends",
        "schemaVersion": 1,
        "contentVersion": "2026-06-23-just-friends-pilot-v1",
        "title": "Just Friends?",
        "description": {
            "chinese": "用场景、人物表情和原书音频读完整个故事。",
            "english": "Read the complete story with reusable scenes, character expressions, and original sentence audio.",
        },
        "initialLocationId": "campus",
        "openingQuestId": "just-friends-story",
        "assetManifestPath": f"{runtime_prefix}/asset-manifest.json",
        "characters": cast,
        "locations": {
            "campus": {
                "id": "campus",
                "name": {"chinese": "中山大学", "english": "University Campus"},
                "description": {"chinese": "故事从两个好朋友开始。", "english": "The story begins with two best friends."},
                "backgroundId": "campus-day",
                "travelTo": [],
                "availableActions": [
                    {
                        "id": "read-story",
                        "label": {"chinese": "开始故事", "english": "Start story"},
                        "kind": "quest",
                        "targetId": "just-friends-story",
                    }
                ],
            }
        },
        "quests": {
            "just-friends-story": {
                "id": "just-friends-story",
                "title": {"chinese": "我们是朋友吗？", "english": "Just Friends?"},
                "category": "main",
                "description": {"chinese": "完整故事", "english": "The complete graded reader"},
                "scriptPath": f"{runtime_prefix}/quests/story.json",
                "scriptId": "just-friends-story",
                "entryNodeId": "jf-001",
                "resultNodeIds": ["jf-result"],
                "repeatable": True,
                "returnLocationId": "campus",
            }
        },
        "initialState": {
            "currentLocationId": "campus",
            "money": 0,
            "skills": {},
            "flags": {},
            "questStates": {
                "just-friends-story": {
                    "status": "available",
                    "completions": 0,
                    "updatedAt": "2026-06-23T00:00:00.000Z",
                }
            },
            "unlockedLocations": ["campus"],
            "unlockedTitles": [],
            "completedEncounterIds": [],
            "encounterCounts": {},
            "committedResultIds": [],
        },
    }

    write_json(runtime_root / "asset-manifest.json", asset_manifest)
    write_json(runtime_root / "world.json", world)
    write_json(runtime_root / "quests" / "story.json", script)

    world_index_path = PACK_ROOT / "lms-books" / "visual-novels" / "worlds" / "index.json"
    index = read_json(world_index_path)
    entries = index if isinstance(index, list) else index.get("worlds", [])
    entry = {
        "id": "just-friends",
        "title": "Just Friends?",
        "description": "Complete scene-mode pilot with reusable backgrounds and character expressions.",
        "worldPath": f"{runtime_prefix}/world.json",
    }
    entries = [item for item in entries if item.get("id") != entry["id"]] + [entry]
    write_json(world_index_path, entries if isinstance(index, list) else {"worlds": entries})
    print(f"Built Just Friends scene pilot with {len(ordered_sentences)} linked sentence nodes.")


def verify(args: argparse.Namespace) -> None:
    rows = audit_rows(discover_packs())
    print_audit(rows, verbose=args.verbose)
    errors = []
    for row in rows:
        if row["missingAudio"] or row["invalidAudio"]:
            errors.append(f"{row['packId']} has incomplete audio")
        if row["covers"] != row["books"]:
            errors.append(f"{row['packId']} has incomplete covers")

    if ART_PLAN_PATH.exists():
        for asset in read_json(ART_PLAN_PATH)["assets"]:
            path = ROOT / asset["output"]
            if not path.exists() or path.stat().st_size == 0:
                errors.append(f"Missing art asset: {asset['output']}")
            if path.exists() and asset["kind"] != "cover":
                pack_root = ROOT / "public" / "reader-packs" / "just-friends"
                try:
                    relative = path.relative_to(pack_root)
                except ValueError:
                    continue
                if path.stat().st_size > 2_500_000:
                    errors.append(f"Scene asset exceeds 2.5 MB: {relative}")

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
    print("Reader asset verification passed.")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    audit_parser = subparsers.add_parser("audit")
    audit_parser.add_argument("--verbose", action="store_true")

    normalize_parser = subparsers.add_parser("normalize")
    normalize_parser.add_argument("--pack", action="append")

    audio_parser = subparsers.add_parser("generate-audio")
    audio_parser.add_argument("--pack", action="append")
    audio_parser.add_argument("--replace", action="store_true")
    audio_parser.add_argument("--workers", type=int, default=4)
    audio_parser.add_argument("--dry-run", action="store_true")

    art_parser = subparsers.add_parser("generate-art")
    art_parser.add_argument("--only", action="append", choices=["cover", "background", "sprite", "cinematic"])
    art_parser.add_argument("--asset", action="append")
    art_parser.add_argument("--replace", action="store_true")
    art_parser.add_argument("--dry-run", action="store_true")

    install_parser = subparsers.add_parser("install-art")
    install_parser.add_argument("--asset", required=True)
    install_parser.add_argument("--source", required=True)

    subparsers.add_parser("build-scene-pilot")

    verify_parser = subparsers.add_parser("verify")
    verify_parser.add_argument("--verbose", action="store_true")
    return parser


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    load_dotenv()
    args = build_parser().parse_args()
    if args.command == "audit":
        print_audit(audit_rows(discover_packs()), verbose=args.verbose)
    elif args.command == "normalize":
        normalize_reader_metadata(args)
    elif args.command == "generate-audio":
        generate_audio(args)
    elif args.command == "generate-art":
        generate_art(args)
    elif args.command == "install-art":
        install_art(args)
    elif args.command == "build-scene-pilot":
        build_just_friends_scene_pilot()
    elif args.command == "verify":
        verify(args)


if __name__ == "__main__":
    main()
