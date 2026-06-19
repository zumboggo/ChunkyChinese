from __future__ import annotations

import json
import sys
import tempfile
import types
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

from PIL import Image

TOOL_DIR = Path(__file__).resolve().parents[1]
if str(TOOL_DIR) not in sys.path:
    sys.path.insert(0, str(TOOL_DIR))

from build_comic_pack import build_parser, initialize_project
from comic_pack_schema import build_pack_documents, export_pack, save_project, validate_project
from image_utils import natural_sort_key
from ocr import _call_engine, create_paddle_engine, normalize_box, normalize_ocr_response, sort_reading_order


class ComicPackBuilderTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.input_dir = self.root / "raw"
        self.project_dir = self.root / "project"
        self.input_dir.mkdir()

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_natural_sorting(self) -> None:
        names = ["page-10.png", "page-2.png", "page-1.png"]
        self.assertEqual(sorted(names, key=natural_sort_key), ["page-1.png", "page-2.png", "page-10.png"])

    def test_project_initialization(self) -> None:
        self.make_image("10.png", (40, 80))
        self.make_image("2.png", (30, 60))
        project = initialize_project(self.init_args())
        pages = project["chapters"][0]["pages"]
        self.assertEqual([page["originalFilename"] for page in pages], ["2.png", "10.png"])
        self.assertEqual(pages[0]["image"], "images/chapter-01-page-001.webp")
        self.assertTrue((self.project_dir / "project.json").is_file())

    def test_mocked_paddle_response_normalization(self) -> None:
        response = [[
            [[[20, 20], [120, 20], [120, 70], [20, 70]], ["你好", 0.96]],
            [[[10, 120], [160, 120], [160, 180], [10, 180]], ["再见", 0.63]],
        ]]
        bubbles = normalize_ocr_response(response, "page-001", 200, 400, confidence_threshold=0.75)
        self.assertEqual([bubble["chinese"] for bubble in bubbles], ["你好", "再见"])
        self.assertFalse(bubbles[0]["needsReview"])
        self.assertTrue(bubbles[1]["needsReview"])

    def test_current_paddle_engine_configuration(self) -> None:
        received: dict[str, object] = {}

        class FakePaddleOCR:
            def __init__(self, **kwargs):
                received.update(kwargs)

        with patch.dict(sys.modules, {"paddleocr": types.SimpleNamespace(PaddleOCR=FakePaddleOCR)}):
            engine = create_paddle_engine("zh")

        self.assertIsInstance(engine, FakePaddleOCR)
        self.assertEqual(received["lang"], "ch")
        self.assertFalse(received["use_doc_orientation_classify"])
        self.assertFalse(received["use_doc_unwarping"])
        self.assertTrue(received["use_textline_orientation"])

    def test_predict_is_preferred_for_current_paddle(self) -> None:
        calls: list[str] = []

        class FakeEngine:
            def predict(self, path):
                calls.append(f"predict:{path}")
                return ["current"]

            def ocr(self, path, cls=True):
                calls.append(f"ocr:{path}:{cls}")
                return ["legacy"]

        result = _call_engine(FakeEngine(), Path("page.webp"))
        self.assertEqual(result, ["current"])
        self.assertEqual(calls, ["predict:page.webp"])

    def test_current_paddle_json_result_normalization(self) -> None:
        response = [{
            "res": {
                "dt_polys": [[[20, 20], [120, 20], [120, 70], [20, 70]]],
                "rec_texts": ["你好"],
                "rec_scores": [0.96],
            }
        }]
        bubbles = normalize_ocr_response(response, "page-001", 200, 400)
        self.assertEqual(len(bubbles), 1)
        self.assertEqual(bubbles[0]["chinese"], "你好")

    def test_non_chinese_ocr_noise_is_excluded(self) -> None:
        response = [{
            "res": {
                "dt_polys": [
                    [[20, 20], [120, 20], [120, 70], [20, 70]],
                    [[20, 80], [120, 80], [120, 130], [20, 130]],
                ],
                "rec_texts": ["W", "气血："],
                "rec_scores": [0.99, 0.98],
            }
        }]
        bubbles = normalize_ocr_response(response, "page-001", 200, 400)
        self.assertEqual([bubble["chinese"] for bubble in bubbles], ["气血："])

    def test_reading_order_uses_vertical_bands_then_left_to_right(self) -> None:
        candidates = [
            self.candidate("right", x=200, y=10),
            self.candidate("lower", x=5, y=180),
            self.candidate("left", x=10, y=30),
        ]
        ordered = sort_reading_order(candidates, vertical_band_threshold=100)
        self.assertEqual([item["id"] for item in ordered], ["left", "right", "lower"])
        self.assertEqual([item["order"] for item in ordered], [1, 2, 3])

    def test_coordinate_normalization(self) -> None:
        normalized, pixels = normalize_box(
            [[100, 200], [500, 200], [500, 600], [100, 600]],
            1000,
            2000,
        )
        self.assertEqual(pixels, {"x": 100, "y": 200, "width": 400, "height": 400})
        self.assertEqual(normalized, {"x": 0.1, "y": 0.1, "width": 0.4, "height": 0.2})

    def test_duplicate_id_validation(self) -> None:
        project = self.valid_project()
        duplicate = dict(project["chapters"][0]["pages"][0]["bubbles"][0])
        project["chapters"][0]["pages"][0]["bubbles"].append(duplicate)
        report = validate_project(self.project_dir, project)
        self.assertTrue(any("Duplicate bubble ID" in error for error in report["errors"]))

    def test_missing_image_validation(self) -> None:
        project = self.valid_project(write_image=False)
        report = validate_project(self.project_dir, project)
        self.assertTrue(any("missing image" in error for error in report["errors"]))

    def test_invalid_path_validation(self) -> None:
        project = self.valid_project()
        project["chapters"][0]["pages"][0]["image"] = "../secret.png"
        report = validate_project(self.project_dir, project)
        self.assertTrue(any("not a safe relative path" in error for error in report["errors"]))

    def test_ignored_bubbles_are_excluded(self) -> None:
        project = self.valid_project()
        project["chapters"][0]["pages"][0]["bubbles"].append({
            **self.bubble("ignored", order=2),
            "chinese": "",
            "ignored": True,
        })
        manifest, chapters = build_pack_documents(project)
        self.assertEqual(manifest["format"], "chunky-comic-pack")
        exported = chapters["chapters/chapter-01.json"]["pages"][0]["bubbles"]
        self.assertEqual([bubble["id"] for bubble in exported], ["bubble-001"])

    def test_export_zip_root_structure(self) -> None:
        project = self.valid_project()
        save_project(self.project_dir, project)
        output = self.root / "dist" / "test.comicpack.zip"
        export_pack(self.project_dir, output)
        with zipfile.ZipFile(output) as archive:
            names = set(archive.namelist())
        self.assertIn("manifest.json", names)
        self.assertIn("chapters/chapter-01.json", names)
        self.assertIn("images/chapter-01-page-001.png", names)
        self.assertFalse(any(name.startswith("test/") for name in names))

    def test_exported_manifest_matches_reader_schema(self) -> None:
        project = self.valid_project()
        save_project(self.project_dir, project)
        output = self.root / "test.comicpack.zip"
        export_pack(self.project_dir, output)
        with zipfile.ZipFile(output) as archive:
            manifest = json.loads(archive.read("manifest.json"))
        self.assertEqual(manifest["format"], "chunky-comic-pack")
        self.assertEqual(manifest["formatVersion"], 1)
        self.assertEqual(manifest["chapters"][0]["file"], "chapters/chapter-01.json")

    def test_exported_chapter_matches_reader_schema(self) -> None:
        project = self.valid_project()
        save_project(self.project_dir, project)
        output = self.root / "test.comicpack.zip"
        export_pack(self.project_dir, output)
        with zipfile.ZipFile(output) as archive:
            chapter = json.loads(archive.read("chapters/chapter-01.json"))
        page = chapter["pages"][0]
        bubble = page["bubbles"][0]
        self.assertEqual(page["image"], "images/chapter-01-page-001.png")
        self.assertEqual(bubble["type"], "dialogue")
        self.assertEqual(bubble["order"], 1)
        self.assertEqual(bubble["box"]["width"], 0.4)

    def make_image(self, name: str, size: tuple[int, int]) -> Path:
        path = self.input_dir / name
        Image.new("RGB", size, "#f3d8a8").save(path)
        return path

    def init_args(self):
        parser = build_parser()
        return parser.parse_args([
            "init",
            "--input", str(self.input_dir),
            "--project", str(self.project_dir),
            "--pack-id", "test-comic",
            "--title", "Test Comic",
            "--title-zh", "测试漫画",
            "--chapter-id", "chapter-01",
            "--chapter-title", "Chapter 1",
        ])

    def valid_project(self, write_image: bool = True):
        image_dir = self.project_dir / "images"
        image_dir.mkdir(parents=True, exist_ok=True)
        if write_image:
            Image.new("RGB", (100, 200), "#ffffff").save(image_dir / "chapter-01-page-001.png")
        return {
            "format": "chunky-comic-builder-project",
            "formatVersion": 1,
            "packId": "test-comic",
            "title": "Test Comic",
            "titleChinese": "测试漫画",
            "language": "zh-CN",
            "chapters": [{
                "id": "chapter-01",
                "title": "Chapter 1",
                "pages": [{
                    "id": "page-001",
                    "image": "images/chapter-01-page-001.png",
                    "originalFilename": "001.png",
                    "width": 100,
                    "height": 200,
                    "bubbles": [self.bubble("bubble-001")],
                }],
            }],
        }

    @staticmethod
    def bubble(bubble_id: str, order: int = 1):
        return {
            "id": bubble_id,
            "pageId": "page-001",
            "order": order,
            "rawText": "你好",
            "chinese": "你好",
            "english": "Hello",
            "type": "dialogue",
            "confidence": 0.95,
            "box": {"x": 0.1, "y": 0.1, "width": 0.4, "height": 0.1},
            "sourceBoxPixels": {"x": 10, "y": 20, "width": 40, "height": 20},
            "needsReview": False,
            "ignored": False,
        }

    @staticmethod
    def candidate(candidate_id: str, x: int, y: int):
        return {
            "id": candidate_id,
            "sourceBoxPixels": {"x": x, "y": y, "width": 20, "height": 20},
        }


if __name__ == "__main__":
    unittest.main()
