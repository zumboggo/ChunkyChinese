import os
import sys
import json
import subprocess

# Paths
base_dir = r"C:\Users\LENOVO\Documents\LearnChinese\ChunkyChineseVocab\tools\comic-pack-builder"
project_dir = os.path.join(base_dir, "projects", "dsx")
raw_dir = os.path.join(base_dir, "raw-images", "dsx")
out_zip = os.path.join(base_dir, "dist", "dsx.comicpack.zip")
python_exe = sys.executable

print("Running init...")
subprocess.run([
    python_exe, "build_comic_pack.py", "init",
    "--input", raw_dir,
    "--project", project_dir,
    "--pack-id", "dsx",
    "--title", "我家大师兄脑子有坑 1",
    "--chapter-id", "chapter-01",
    "--chapter-title", "Chapter 1"
], check=True)

# Read project.json
project_json_path = os.path.join(project_dir, "project.json")
with open(project_json_path, 'r', encoding='utf-8') as f:
    project = json.load(f)

# Split pages into 15-page chapters
pages = project["chapters"][0]["pages"]
new_chapters = []

chunk_size = 15
for i in range(0, len(pages), chunk_size):
    chunk = pages[i:i + chunk_size]
    chapter_num = (i // chunk_size) + 1
    new_chapters.append({
        "id": f"chapter-{chapter_num:02d}",
        "title": f"Part {chapter_num}",
        "titleChinese": f"第{chapter_num}部分",
        "pages": chunk
    })

project["chapters"] = new_chapters

with open(project_json_path, 'w', encoding='utf-8') as f:
    json.dump(project, f, ensure_ascii=False, indent=2)

print(f"Split into {len(new_chapters)} chapters of up to 15 pages each.")

print("Running ocr...")
# This will take a while for 272 pages
subprocess.run([
    python_exe, "build_comic_pack.py", "ocr",
    "--project", project_dir,
    "--lang", "zh"
], check=True)

print("Running validate...")
subprocess.run([
    python_exe, "build_comic_pack.py", "validate",
    "--project", project_dir
], check=True)

print("Running export...")
os.makedirs(os.path.dirname(out_zip), exist_ok=True)
subprocess.run([
    python_exe, "build_comic_pack.py", "export",
    "--project", project_dir,
    "--out", out_zip
], check=True)

print("Done! Pack is ready at:", out_zip)
