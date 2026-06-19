from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterable

from comic_pack_schema import load_project, save_project


def normalize_box(
    points: Iterable[Iterable[float]],
    image_width: int,
    image_height: int,
) -> tuple[dict[str, float], dict[str, int]]:
    point_list = [list(point) for point in points]
    if not point_list or image_width <= 0 or image_height <= 0:
        raise ValueError("OCR box and image dimensions are required.")
    xs = [float(point[0]) for point in point_list]
    ys = [float(point[1]) for point in point_list]
    x1 = max(0.0, min(xs))
    y1 = max(0.0, min(ys))
    x2 = min(float(image_width), max(xs))
    y2 = min(float(image_height), max(ys))
    pixel_box = {
        "x": round(x1),
        "y": round(y1),
        "width": max(1, round(x2 - x1)),
        "height": max(1, round(y2 - y1)),
    }
    normalized = {
        "x": round(pixel_box["x"] / image_width, 6),
        "y": round(pixel_box["y"] / image_height, 6),
        "width": round(pixel_box["width"] / image_width, 6),
        "height": round(pixel_box["height"] / image_height, 6),
    }
    return normalized, pixel_box


def sort_reading_order(
    candidates: list[dict[str, Any]],
    vertical_band_threshold: int = 80,
) -> list[dict[str, Any]]:
    threshold = max(1, vertical_band_threshold)

    def key(candidate: dict[str, Any]) -> tuple[int, int, int]:
        box = candidate["sourceBoxPixels"]
        center_y = box["y"] + box["height"] // 2
        return (center_y // threshold, box["x"], center_y)

    ordered = sorted(candidates, key=key)
    for order, candidate in enumerate(ordered, start=1):
        candidate["order"] = order
    return ordered


def normalize_ocr_response(
    response: Any,
    page_id: str,
    image_width: int,
    image_height: int,
    confidence_threshold: float = 0.75,
    vertical_band_threshold: int = 80,
) -> list[dict[str, Any]]:
    rows = list(_iter_ocr_rows(response))
    candidates: list[dict[str, Any]] = []
    for index, (points, text, confidence) in enumerate(rows, start=1):
        cleaned = str(text).strip()
        if not cleaned:
            continue
        box, source_box = normalize_box(points, image_width, image_height)
        candidates.append(
            {
                "id": f"{page_id}-bubble-{index:03d}",
                "pageId": page_id,
                "order": index,
                "rawText": cleaned,
                "chinese": cleaned,
                "english": "",
                "type": "dialogue",
                "confidence": round(float(confidence), 4),
                "box": box,
                "sourceBoxPixels": source_box,
                "needsReview": float(confidence) < confidence_threshold,
                "ignored": False,
            }
        )
    return sort_reading_order(candidates, vertical_band_threshold)


def create_paddle_engine(language: str = "zh"):
    try:
        from paddleocr import PaddleOCR
    except ImportError as error:
        raise RuntimeError(
            "PaddleOCR is not installed. Install requirements-ocr.txt, "
            "or use the review UI for manual bubble entry."
        ) from error
    paddle_language = "chinese_cht" if language in {"zh-TW", "cht", "traditional"} else "ch"
    try:
        return PaddleOCR(use_angle_cls=True, lang=paddle_language, show_log=False)
    except TypeError:
        return PaddleOCR(lang=paddle_language)


def run_project_ocr(
    project_dir: Path | str,
    language: str = "zh",
    confidence_threshold: float = 0.75,
    vertical_band_threshold: int = 80,
    engine: Any | None = None,
) -> int:
    root = Path(project_dir)
    project = load_project(root)
    engine = engine or create_paddle_engine(language)
    ocr_dir = root / "ocr"
    ocr_dir.mkdir(parents=True, exist_ok=True)
    total = 0

    for chapter in project["chapters"]:
        for page in chapter["pages"]:
            image_path = root / Path(page["image"])
            response = _call_engine(engine, image_path)
            candidates = normalize_ocr_response(
                response,
                page["id"],
                page["width"],
                page["height"],
                confidence_threshold,
                vertical_band_threshold,
            )
            page["bubbles"] = candidates
            (ocr_dir / f"{page['id']}.ocr.json").write_text(
                json.dumps(candidates, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            total += len(candidates)
    save_project(root, project)
    return total


def _call_engine(engine: Any, image_path: Path) -> Any:
    if hasattr(engine, "ocr"):
        return engine.ocr(str(image_path), cls=True)
    if hasattr(engine, "predict"):
        return engine.predict(str(image_path))
    raise RuntimeError("Unsupported OCR engine: expected ocr() or predict().")


def _iter_ocr_rows(response: Any):
    if response is None:
        return
    if hasattr(response, "json"):
        json_value = response.json() if callable(response.json) else response.json
        yield from _iter_ocr_rows(json_value)
        return
    if hasattr(response, "res"):
        yield from _iter_ocr_rows(response.res)
        return
    if isinstance(response, dict):
        texts = response.get("rec_texts") or response.get("texts") or []
        scores = response.get("rec_scores") or response.get("scores") or []
        boxes = response.get("dt_polys") or response.get("rec_polys") or response.get("boxes") or []
        for points, text, score in zip(boxes, texts, scores):
            yield points, text, score
        return
    if isinstance(response, (list, tuple)):
        for item in response:
            if isinstance(item, dict):
                yield from _iter_ocr_rows(item)
            elif _looks_like_v2_row(item):
                points, recognition = item
                yield points, recognition[0], recognition[1]
            elif isinstance(item, (list, tuple)):
                yield from _iter_ocr_rows(item)


def _looks_like_v2_row(value: Any) -> bool:
    return (
        isinstance(value, (list, tuple))
        and len(value) == 2
        and isinstance(value[0], (list, tuple))
        and isinstance(value[1], (list, tuple))
        and len(value[1]) >= 2
        and isinstance(value[1][0], str)
    )
