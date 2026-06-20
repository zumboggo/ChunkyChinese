# Desktop Comic Pack Builder

The Desktop Comic Pack Builder converts a folder of legally obtained Chinese comic images into a local, editable project and then exports a `.comicpack.zip` for ChunkyChinese Comic Reader.

Everything runs on your computer. The default workflow does not upload images, OCR text, or translations anywhere.

## What It Does

- Imports `.png`, `.jpg`, `.jpeg`, and `.webp` pages in natural filename order.
- Renames pages consistently and optionally converts them to quality-controlled WebP.
- Runs optional local Simplified or Traditional Chinese OCR through PaddleOCR.
- Discards OCR detections with no Chinese characters to reduce logo and HUD noise.
- Stores OCR text, confidence, pixel boxes, normalized boxes, and reading order in `project.json`.
- Provides a localhost review interface for editing text, translations, types, order, boxes, and review/ignore state.
- Supports manual missing-bubble creation and false-positive deletion.
- Optionally translates one page through an explicitly configured local OpenAI-compatible endpoint.
- Validates and exports a Phase 1-compatible `.comicpack.zip` with no wrapping directory.

It does not scrape websites, download comics, upload projects, perform cloud OCR, or redistribute comic files.

## Setup

From `tools/comic-pack-builder`:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
```

`requirements.txt` installs Pillow for image conversion, dimensions, and optional long-page splitting.

For local OCR, install the optional PaddleOCR stack:

```powershell
py -m pip install paddlepaddle==3.2.0 -i https://www.paddlepaddle.org.cn/packages/stable/cpu/
py -m pip install -r requirements-ocr.txt
```

PaddleOCR/PaddlePaddle wheels vary by operating system and CPU/GPU. Use the current [PaddlePaddle installation guide](https://www.paddlepaddle.org.cn/documentation/docs/en/install/index_en.html) for a different runtime, and the [PaddleOCR installation guide](https://paddlepaddle.github.io/PaddleOCR/main/en/version3.x/installation.html) for current package options.

OCR is optional. You can initialize a project, launch the review UI, and add transcript boxes manually without installing PaddleOCR.

## Standard Workflow

### 1. Initialize

```powershell
py build_comic_pack.py init `
  --input .\raw-images `
  --project .\projects\my-comic `
  --pack-id my-comic `
  --title "My Comic" `
  --title-zh "我的漫画" `
  --chapter-id chapter-01 `
  --chapter-title "Chapter 1"
```

Use `--no-convert` to preserve source formats. The default converts to WebP at quality `88`.

### 2. Run Local OCR

Simplified Chinese:

```powershell
py build_comic_pack.py ocr --project .\projects\my-comic --lang zh
```

Traditional Chinese:

```powershell
py build_comic_pack.py ocr --project .\projects\my-comic --lang zh-TW
```

Reading order is guessed top-to-bottom, then left-to-right within a configurable vertical band:

```powershell
py build_comic_pack.py ocr `
  --project .\projects\my-comic `
  --vertical-band-threshold 100 `
  --confidence-threshold 0.8
```

### 3. Review

```powershell
py review_server.py .\projects\my-comic
```

The server binds only to `127.0.0.1` and opens:

```text
http://127.0.0.1:8765/
```

The review interface supports:

- Clicking image boxes or transcript regions.
- Chinese and English editing.
- Dialogue, narration, thought, and sound-effect classification.
- Needs-review and ignored flags.
- Up/down reading-order changes.
- Manual normalized box coordinates.
- Adding missing regions.
- Deleting false OCR regions.
- Project save with `Ctrl+S`.
- Validation and ZIP export.

Exports created by the UI are written to:

```text
projects/<pack-id>/exports/<pack-id>.comicpack.zip
```

### 4. Validate

```powershell
py build_comic_pack.py validate --project .\projects\my-comic
```

### 5. Export

```powershell
py build_comic_pack.py export `
  --project .\projects\my-comic `
  --out .\dist\my-comic.comicpack.zip
```

Import that ZIP from ChunkyChinese: **Comic Reader -> Import Comic Pack**.

## Convenience Command

This initializes, runs OCR, validates, and exports:

```powershell
py build_comic_pack.py all `
  --input .\raw-images `
  --project .\projects\my-comic `
  --out .\dist\my-comic.comicpack.zip `
  --pack-id my-comic `
  --title "My Comic" `
  --title-zh "我的漫画" `
  --chapter-id chapter-01 `
  --chapter-title "Chapter 1"
```

The editable project and OCR sidecars remain available after `all`. Review is still recommended before importing the pack.

## Long Webtoon Pages

Split tall source pages before initialization:

```powershell
py build_comic_pack.py split-long-pages `
  --input .\raw-images `
  --out .\split-images `
  --max-height 2400
```

The splitter uses simple consecutive crops. It does not detect panels or avoid cutting through speech balloons.

## Optional Local Translation

Manual English translation is always supported and blank translations are valid.

### Ollama with Hy-MT2-1.8B

Install the official Tencent Q4_K_M GGUF model and the project-specific chat template:

```powershell
ollama create hy-mt2:1.8b -f .\ollama\Hy-MT2-1.8B.Modelfile
```

The custom Modelfile is required because the upstream GGUF's automatically generated
Ollama template does not currently preserve the user prompt correctly.

To translate with Ollama:

```powershell
py build_comic_pack.py translate `
  --project .\projects\my-comic `
  --page-id page-001 `
  --endpoint http://127.0.0.1:11434/v1/chat/completions `
  --model hy-mt2:1.8b
```

`hy-mt2:1.8b` is the default in both the CLI and review UI. The endpoint and model
fields remain configurable for LM Studio, OpenWebUI, or another local model.
Translation is never triggered automatically.

## Project Layout

```text
projects/my-comic/
  project.json
  images/
    chapter-01-page-001.webp
  ocr/
    page-001.ocr.json
  exports/
    my-comic.comicpack.zip
```

Images remain separate files. `project.json` never stores base64 page data.

## Tests

```powershell
py -m unittest discover -s tests -v
```

OCR is mocked in tests, so model downloads are not required.

## Troubleshooting

### OCR model is not installed

Install `requirements-ocr.txt`, or skip OCR and add bubbles manually in the review UI.

### PaddleOCR is too slow

Run OCR once and resume from the saved JSON project. Split extremely tall pages first. CPU OCR can take substantial time on high-resolution webtoon images.

### Chinese text is recognized poorly

Keep the original image resolution, correct the Chinese manually, adjust the confidence threshold, and mark uncertain regions for review. Decorative fonts and vertical lettering remain difficult.

### Long pages use too much memory

Use `split-long-pages --max-height 2400` before initialization. Compressed file size is not the same as image decode memory.

### ChunkyChinese says `manifest.json` is missing

Do not manually wrap the generated files in another folder. The builder export already places `manifest.json` at the ZIP root.

### OCR creates text in the wrong order

Change `--vertical-band-threshold`, then reorder the final regions with the up/down controls.

## Privacy And Copyright

Use only material you are legally permitted to possess and process. This tool is intended for private study. Do not commit local projects, raw images, OCR caches, or exported packs, and do not distribute processed packs without permission.
