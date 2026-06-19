from __future__ import annotations

import json
import os
import tempfile
import zipfile
from pathlib import Path, PurePosixPath
from typing import Any

PROJECT_FORMAT = "chunky-comic-builder-project"
PROJECT_FORMAT_VERSION = 1
PACK_FORMAT = "chunky-comic-pack"
PACK_FORMAT_VERSION = 1
BUBBLE_TYPES = {"dialogue", "narration", "thought", "sfx"}


def load_project(project_dir: Path | str) -> dict[str, Any]:
    path = Path(project_dir) / "project.json"
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise ValueError(f"Project file not found: {path}") from error
    except json.JSONDecodeError as error:
        raise ValueError(f"Project JSON is invalid: {error}") from error


def save_project(project_dir: Path | str, project: dict[str, Any]) -> None:
    project_path = Path(project_dir)
    project_path.mkdir(parents=True, exist_ok=True)
    destination = project_path / "project.json"
    fd, temporary_name = tempfile.mkstemp(
        prefix="project-",
        suffix=".json",
        dir=project_path,
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
            json.dump(project, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        Path(temporary_name).replace(destination)
    finally:
        temporary = Path(temporary_name)
        if temporary.exists():
            temporary.unlink()


def safe_relative_path(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} is missing.")
    normalized = value.strip().replace("\\", "/")
    path = PurePosixPath(normalized)
    if (
        path.is_absolute()
        or ".." in path.parts
        or "" in path.parts
        or (path.parts and ":" in path.parts[0])
    ):
        raise ValueError(f'{label} "{value}" is not a safe relative path.')
    return path.as_posix()


def validate_project(project_dir: Path | str, project: dict[str, Any] | None = None) -> dict[str, list[str]]:
    root = Path(project_dir)
    project = project or load_project(root)
    errors: list[str] = []
    warnings: list[str] = []

    if project.get("format") != PROJECT_FORMAT:
        errors.append(f'Project format must be "{PROJECT_FORMAT}".')
    if project.get("formatVersion") != PROJECT_FORMAT_VERSION:
        errors.append(f"Unsupported project formatVersion: {project.get('formatVersion')!r}.")

    for field in ("packId", "title", "language"):
        if not isinstance(project.get(field), str) or not project[field].strip():
            errors.append(f"Missing project field: {field}.")
    if project.get("language") not in {"zh-CN", "zh-TW"}:
        errors.append("Project language must be zh-CN or zh-TW.")

    chapters = project.get("chapters")
    if not isinstance(chapters, list) or not chapters:
        errors.append("Project must contain at least one chapter.")
        return {"errors": errors, "warnings": warnings}

    chapter_ids: set[str] = set()
    page_ids: set[str] = set()
    bubble_ids: set[str] = set()
    exportable_pages = 0

    for chapter_index, chapter in enumerate(chapters):
        chapter_label = f"Chapter {chapter_index + 1}"
        chapter_id = _required_id(chapter, "id", chapter_label, errors)
        if chapter_id:
            _check_duplicate(chapter_id, chapter_ids, "chapter", errors)
        if not isinstance(chapter.get("title"), str) or not chapter["title"].strip():
            errors.append(f"{chapter_label} is missing a title.")

        pages = chapter.get("pages")
        if not isinstance(pages, list):
            errors.append(f'{chapter_label} "{chapter_id}" has no page list.')
            continue
        for page_index, page in enumerate(pages):
            page_label = f"{chapter_label}, page {page_index + 1}"
            page_id = _required_id(page, "id", page_label, errors)
            if page_id:
                _check_duplicate(page_id, page_ids, "page", errors)
            try:
                image_path = safe_relative_path(page.get("image"), f"{page_label} image")
                absolute_image = root / Path(*PurePosixPath(image_path).parts)
                if not absolute_image.is_file():
                    errors.append(f'{page_label} references missing image "{image_path}".')
                else:
                    exportable_pages += 1
            except ValueError as error:
                errors.append(str(error))

            for dimension in ("width", "height"):
                value = page.get(dimension)
                if not isinstance(value, int) or value <= 0:
                    errors.append(f"{page_label} {dimension} must be a positive integer.")

            bubbles = page.get("bubbles", [])
            if not isinstance(bubbles, list):
                errors.append(f"{page_label} bubbles must be a list.")
                continue
            for bubble_index, bubble in enumerate(bubbles):
                bubble_label = f"{page_label}, bubble {bubble_index + 1}"
                bubble_id = _required_id(bubble, "id", bubble_label, errors)
                if bubble_id:
                    _check_duplicate(bubble_id, bubble_ids, "bubble", errors)
                if bubble.get("type") not in BUBBLE_TYPES:
                    errors.append(f'{bubble_label} has invalid type "{bubble.get("type")}".')
                if not bubble.get("ignored") and (
                    not isinstance(bubble.get("chinese"), str) or not bubble["chinese"].strip()
                ):
                    errors.append(f"{bubble_label} has empty Chinese text.")
                if bubble.get("needsReview"):
                    warnings.append(f"{bubble_label} is still marked as needing review.")
                _validate_box(bubble.get("box"), bubble_label, errors)

    if exportable_pages == 0:
        errors.append("Project has no exportable pages.")
    return {"errors": errors, "warnings": warnings}


def build_pack_documents(project: dict[str, Any]) -> tuple[dict[str, Any], dict[str, dict[str, Any]]]:
    chapter_documents: dict[str, dict[str, Any]] = {}
    chapter_references: list[dict[str, Any]] = []

    for chapter in project["chapters"]:
        chapter_file = f"chapters/{chapter['id']}.json"
        chapter_references.append(
            _without_empty(
                {
                    "id": chapter["id"],
                    "title": chapter["title"],
                    "titleChinese": chapter.get("titleChinese"),
                    "file": chapter_file,
                }
            )
        )
        pages: list[dict[str, Any]] = []
        for page in chapter.get("pages", []):
            bubbles = []
            export_order = 1
            for bubble in sorted(
                (item for item in page.get("bubbles", []) if not item.get("ignored")),
                key=lambda item: (item.get("order", 0), item.get("id", "")),
            ):
                bubbles.append(
                    _without_empty(
                        {
                            "id": bubble["id"],
                            "order": export_order,
                            "chinese": bubble["chinese"].strip(),
                            "english": bubble.get("english", "").strip(),
                            "type": bubble["type"],
                            "box": bubble.get("box"),
                        }
                    )
                )
                export_order += 1
            pages.append(
                _without_empty(
                    {
                        "id": page["id"],
                        "image": page["image"],
                        "width": page.get("width"),
                        "height": page.get("height"),
                        "bubbles": bubbles,
                    }
                )
            )
        chapter_documents[chapter_file] = _without_empty(
            {
                "id": chapter["id"],
                "title": chapter["title"],
                "titleChinese": chapter.get("titleChinese"),
                "pages": pages,
            }
        )

    first_page = project["chapters"][0]["pages"][0]
    manifest = _without_empty(
        {
            "format": PACK_FORMAT,
            "formatVersion": PACK_FORMAT_VERSION,
            "id": project["packId"],
            "title": project["title"],
            "titleChinese": project.get("titleChinese"),
            "author": project.get("author"),
            "description": project.get("description"),
            "language": project["language"],
            "coverImage": project.get("coverImage") or first_page["image"],
            "chapters": chapter_references,
        }
    )
    return manifest, chapter_documents


def export_pack(project_dir: Path | str, output_path: Path | str) -> dict[str, Any]:
    root = Path(project_dir)
    project = load_project(root)
    report = validate_project(root, project)
    if report["errors"]:
        raise ValueError("Project validation failed:\n- " + "\n- ".join(report["errors"]))

    manifest, chapter_documents = build_pack_documents(project)
    destination = Path(output_path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(destination.suffix + ".tmp")
    image_paths = {
        page["image"]
        for chapter in project["chapters"]
        for page in chapter.get("pages", [])
    }

    with zipfile.ZipFile(temporary, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("manifest.json", _json_bytes(manifest))
        for path, chapter in chapter_documents.items():
            archive.writestr(path, _json_bytes(chapter))
        for image_path in sorted(image_paths):
            normalized = safe_relative_path(image_path, "image path")
            source = root / Path(*PurePosixPath(normalized).parts)
            archive.write(source, normalized)
    temporary.replace(destination)
    return {
        "output": str(destination.resolve()),
        "chapters": len(chapter_documents),
        "pages": sum(len(chapter["pages"]) for chapter in chapter_documents.values()),
        "images": len(image_paths),
        "warnings": report["warnings"],
    }


def _json_bytes(value: dict[str, Any]) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def _required_id(item: Any, field: str, label: str, errors: list[str]) -> str | None:
    if not isinstance(item, dict):
        errors.append(f"{label} must be an object.")
        return None
    value = item.get(field)
    if not isinstance(value, str) or not value.strip():
        errors.append(f"{label} is missing {field}.")
        return None
    return value.strip()


def _check_duplicate(value: str, seen: set[str], label: str, errors: list[str]) -> None:
    if value in seen:
        errors.append(f'Duplicate {label} ID "{value}".')
    seen.add(value)


def _validate_box(value: Any, label: str, errors: list[str]) -> None:
    if not isinstance(value, dict):
        errors.append(f"{label} is missing a normalized box.")
        return
    coordinates: dict[str, float] = {}
    for field in ("x", "y", "width", "height"):
        coordinate = value.get(field)
        if not isinstance(coordinate, (int, float)) or coordinate < 0 or coordinate > 1:
            errors.append(f"{label} box {field} must be between 0 and 1.")
            return
        coordinates[field] = float(coordinate)
    if coordinates["x"] + coordinates["width"] > 1.000001:
        errors.append(f"{label} box extends beyond the page width.")
    if coordinates["y"] + coordinates["height"] > 1.000001:
        errors.append(f"{label} box extends beyond the page height.")


def _without_empty(value: dict[str, Any]) -> dict[str, Any]:
    return {
        key: item
        for key, item in value.items()
        if item is not None and item != ""
    }
