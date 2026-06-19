from __future__ import annotations

import re
import shutil
from pathlib import Path
from typing import Any, Iterable

from PIL import Image

SUPPORTED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
_NATURAL_PARTS = re.compile(r"(\d+)")


def natural_sort_key(value: str | Path) -> list[Any]:
    name = Path(value).name.casefold()
    return [
        int(part) if part.isdigit() else part
        for part in _NATURAL_PARTS.split(name)
    ]


def list_source_images(input_dir: Path | str) -> list[Path]:
    root = Path(input_dir)
    if not root.is_dir():
        raise ValueError(f"Input image folder does not exist: {root}")
    images = [
        path
        for path in root.iterdir()
        if path.is_file() and path.suffix.casefold() in SUPPORTED_IMAGE_EXTENSIONS
    ]
    return sorted(images, key=natural_sort_key)


def import_images(
    input_dir: Path | str,
    project_dir: Path | str,
    chapter_id: str,
    convert_to_webp: bool = True,
    webp_quality: int = 88,
) -> list[dict[str, Any]]:
    sources = list_source_images(input_dir)
    if not sources:
        raise ValueError("No supported comic images were found.")
    project_root = Path(project_dir)
    image_dir = project_root / "images"
    image_dir.mkdir(parents=True, exist_ok=True)
    pages: list[dict[str, Any]] = []

    for index, source in enumerate(sources, start=1):
        page_id = f"page-{index:03d}"
        extension = ".webp" if convert_to_webp else source.suffix.casefold()
        filename = f"{chapter_id}-{page_id}{extension}"
        destination = image_dir / filename
        with Image.open(source) as image:
            width, height = image.size
            if convert_to_webp:
                converted = image.convert("RGBA" if "A" in image.getbands() else "RGB")
                converted.save(destination, "WEBP", quality=webp_quality, method=6)
            else:
                shutil.copy2(source, destination)
        pages.append(
            {
                "id": page_id,
                "image": f"images/{filename}",
                "originalFilename": source.name,
                "width": width,
                "height": height,
                "bubbles": [],
            }
        )
    return pages


def split_long_pages(
    input_dir: Path | str,
    output_dir: Path | str,
    max_height: int,
    convert_to_webp: bool = True,
    webp_quality: int = 88,
) -> list[Path]:
    if max_height <= 0:
        raise ValueError("max-height must be positive.")
    destination_root = Path(output_dir)
    destination_root.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []

    for source in list_source_images(input_dir):
        with Image.open(source) as image:
            width, height = image.size
            segment_count = max(1, (height + max_height - 1) // max_height)
            for index in range(segment_count):
                top = index * max_height
                bottom = min(height, top + max_height)
                segment = image.crop((0, top, width, bottom))
                suffix = ".webp" if convert_to_webp else source.suffix.casefold()
                name = (
                    f"{source.stem}-part-{index + 1:03d}{suffix}"
                    if segment_count > 1
                    else f"{source.stem}{suffix}"
                )
                output = destination_root / name
                if convert_to_webp:
                    converted = segment.convert("RGBA" if "A" in segment.getbands() else "RGB")
                    converted.save(output, "WEBP", quality=webp_quality, method=6)
                else:
                    segment.save(output)
                written.append(output)
    return written


def ensure_image_dimensions(project_dir: Path | str, pages: Iterable[dict[str, Any]]) -> None:
    root = Path(project_dir)
    for page in pages:
        if page.get("width") and page.get("height"):
            continue
        image_path = root / Path(page["image"])
        with Image.open(image_path) as image:
            page["width"], page["height"] = image.size
