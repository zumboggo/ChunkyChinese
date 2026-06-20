from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from comic_pack_schema import (
    PROJECT_FORMAT,
    PROJECT_FORMAT_VERSION,
    export_pack,
    load_project,
    save_project,
    validate_project,
)
from image_utils import import_images, split_long_pages
from ocr import run_project_ocr
from translation import OpenAICompatibleLocalProvider


def initialize_project(args: argparse.Namespace) -> dict[str, Any]:
    project_dir = Path(args.project)
    if (project_dir / "project.json").exists() and not args.force:
        raise ValueError(f"Project already exists: {project_dir}. Use --force to replace it.")
    pages = import_images(
        args.input,
        project_dir,
        args.chapter_id,
        convert_to_webp=not args.no_convert,
        webp_quality=args.webp_quality,
    )
    project = {
        "format": PROJECT_FORMAT,
        "formatVersion": PROJECT_FORMAT_VERSION,
        "packId": args.pack_id,
        "title": args.title,
        "titleChinese": args.title_zh or "",
        "author": args.author or "",
        "description": args.description or "",
        "language": args.language,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "settings": {
            "verticalBandThreshold": args.vertical_band_threshold,
            "ocrConfidenceThreshold": args.confidence_threshold,
        },
        "chapters": [
            {
                "id": args.chapter_id,
                "title": args.chapter_title,
                "titleChinese": args.chapter_title_zh or "",
                "pages": pages,
            }
        ],
    }
    save_project(project_dir, project)
    return project


def command_init(args: argparse.Namespace) -> None:
    project = initialize_project(args)
    print(f"Created {args.project} with {len(project['chapters'][0]['pages'])} pages.")


def command_ocr(args: argparse.Namespace) -> None:
    project = load_project(args.project)
    settings = project.get("settings", {})
    total = run_project_ocr(
        args.project,
        language=args.lang,
        confidence_threshold=args.confidence_threshold
        if args.confidence_threshold is not None
        else settings.get("ocrConfidenceThreshold", 0.75),
        vertical_band_threshold=args.vertical_band_threshold
        if args.vertical_band_threshold is not None
        else settings.get("verticalBandThreshold", 80),
    )
    print(f"OCR complete: {total} candidate regions.")


def command_validate(args: argparse.Namespace) -> None:
    report = validate_project(args.project)
    print_report(report)
    if report["errors"]:
        raise SystemExit(1)


def command_export(args: argparse.Namespace) -> None:
    summary = export_pack(args.project, args.out)
    print(json.dumps(summary, indent=2))


def command_all(args: argparse.Namespace) -> None:
    initialize_project(args)
    command_ocr(
        argparse.Namespace(
            project=args.project,
            lang=args.lang,
            confidence_threshold=args.confidence_threshold,
            vertical_band_threshold=args.vertical_band_threshold,
        )
    )
    command_validate(argparse.Namespace(project=args.project))
    command_export(argparse.Namespace(project=args.project, out=args.out))


def command_split(args: argparse.Namespace) -> None:
    paths = split_long_pages(
        args.input,
        args.out,
        args.max_height,
        convert_to_webp=not args.no_convert,
        webp_quality=args.webp_quality,
    )
    print(f"Wrote {len(paths)} images to {Path(args.out).resolve()}.")


def command_translate(args: argparse.Namespace) -> None:
    project = load_project(args.project)
    page = next(
        (
            page
            for chapter in project["chapters"]
            for page in chapter["pages"]
            if page["id"] == args.page_id
        ),
        None,
    )
    if not page:
        raise ValueError(f'Page "{args.page_id}" was not found.')
    provider = OpenAICompatibleLocalProvider(endpoint=args.endpoint, model=args.model)
    translations = provider.translate_page(page.get("bubbles", []))
    by_id = {item["id"]: item["english"] for item in translations}
    for bubble in page.get("bubbles", []):
        if bubble["id"] in by_id:
            bubble["english"] = by_id[bubble["id"]]
            if "[REVIEW]" in bubble["english"]:
                bubble["needsReview"] = True
    save_project(args.project, project)
    print(f"Translated {len(translations)} bubbles on {args.page_id}.")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Build local ChunkyChinese comic packs.")
    commands = parser.add_subparsers(dest="command", required=True)

    init_parser = commands.add_parser("init", help="Create a project from local comic images.")
    add_project_arguments(init_parser)
    init_parser.set_defaults(func=command_init)

    ocr_parser = commands.add_parser("ocr", help="Run local Chinese OCR.")
    ocr_parser.add_argument("--project", required=True)
    ocr_parser.add_argument("--lang", default="zh")
    ocr_parser.add_argument("--confidence-threshold", type=float)
    ocr_parser.add_argument("--vertical-band-threshold", type=int)
    ocr_parser.set_defaults(func=command_ocr)

    validate_parser = commands.add_parser("validate", help="Validate a project.")
    validate_parser.add_argument("--project", required=True)
    validate_parser.set_defaults(func=command_validate)

    export_parser = commands.add_parser("export", help="Export a .comicpack.zip.")
    export_parser.add_argument("--project", required=True)
    export_parser.add_argument("--out", required=True)
    export_parser.set_defaults(func=command_export)

    all_parser = commands.add_parser("all", help="Initialize, OCR, validate, and export.")
    add_project_arguments(all_parser)
    all_parser.add_argument("--out", required=True)
    all_parser.add_argument("--lang", default="zh")
    all_parser.set_defaults(func=command_all)

    split_parser = commands.add_parser("split-long-pages", help="Split tall webtoon pages.")
    split_parser.add_argument("--input", required=True)
    split_parser.add_argument("--out", required=True)
    split_parser.add_argument("--max-height", type=int, default=2400)
    split_parser.add_argument("--no-convert", action="store_true")
    split_parser.add_argument("--webp-quality", type=int, default=88)
    split_parser.set_defaults(func=command_split)

    translate_parser = commands.add_parser("translate", help="Translate one page with a local endpoint.")
    translate_parser.add_argument("--project", required=True)
    translate_parser.add_argument("--page-id", required=True)
    translate_parser.add_argument("--endpoint", default="http://127.0.0.1:11434/v1/chat/completions")
    translate_parser.add_argument("--model", default="hy-mt2:1.8b")
    translate_parser.set_defaults(func=command_translate)
    return parser


def add_project_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--input", required=True)
    parser.add_argument("--project", required=True)
    parser.add_argument("--pack-id", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--title-zh", default="")
    parser.add_argument("--author", default="")
    parser.add_argument("--description", default="")
    parser.add_argument("--language", choices=["zh-CN", "zh-TW"], default="zh-CN")
    parser.add_argument("--chapter-id", required=True)
    parser.add_argument("--chapter-title", required=True)
    parser.add_argument("--chapter-title-zh", default="")
    parser.add_argument("--no-convert", action="store_true")
    parser.add_argument("--webp-quality", type=int, default=88)
    parser.add_argument("--vertical-band-threshold", type=int, default=80)
    parser.add_argument("--confidence-threshold", type=float, default=0.75)
    parser.add_argument("--force", action="store_true")


def print_report(report: dict[str, list[str]]) -> None:
    if report["errors"]:
        print("Errors:")
        for error in report["errors"]:
            print(f"  - {error}")
    if report["warnings"]:
        print("Warnings:")
        for warning in report["warnings"]:
            print(f"  - {warning}")
    if not report["errors"]:
        print("Project validation passed.")


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    try:
        args.func(args)
    except (ValueError, RuntimeError) as error:
        print(f"Error: {error}", file=sys.stderr)
        raise SystemExit(1) from error


if __name__ == "__main__":
    main()
