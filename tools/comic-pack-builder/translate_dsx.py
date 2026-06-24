import os
import sys
import json
import subprocess

# Paths
base_dir = r"C:\Users\LENOVO\Documents\LearnChinese\ChunkyChineseVocab\tools\comic-pack-builder"
sys.path.append(base_dir)

from comic_pack_schema import load_project, save_project
from translation import OpenAICompatibleLocalProvider

project_dir = os.path.join(base_dir, "projects", "dsx")
out_zip = os.path.join(base_dir, "dist", "dsx.comicpack.zip")
python_exe = sys.executable

print("Loading project...")
project = load_project(project_dir)

provider = OpenAICompatibleLocalProvider(endpoint="http://127.0.0.1:11434/v1/chat/completions", model="hy-mt2:1.8b")

total_pages = sum(len(c.get("pages", [])) for c in project["chapters"])
current_page = 0
translated_count = 0

print(f"Total pages to check: {total_pages}")

for chapter in project["chapters"]:
    for page in chapter.get("pages", []):
        current_page += 1
        bubbles = page.get("bubbles", [])
        
        # Find bubbles that need translation
        source_lines = [b for b in bubbles if not b.get("ignored") and b.get("chinese", "").strip()]
        
        # Skip if no lines to translate
        if not source_lines:
            continue
            
        # Skip if all lines already translated
        if all(b.get("english", "").strip() for b in source_lines):
            continue

        print(f"Translating {chapter['id']} / {page['id']} ({current_page}/{total_pages})...")
        try:
            translations = provider.translate_page(bubbles)
            by_id = {item["id"]: item.get("english", "") for item in translations}
            for bubble in bubbles:
                if bubble["id"] in by_id:
                    bubble["english"] = by_id[bubble["id"]]
                    if "[REVIEW]" in bubble["english"]:
                        bubble["needsReview"] = True
            
            translated_count += 1
            # Save incrementally just in case it crashes midway
            save_project(project, project_dir)
        except Exception as e:
            print(f"Failed to translate {page['id']}: {e}")

print(f"Translation loop finished. Translated {translated_count} pages.")
print("Running export and zip...")
subprocess.run([python_exe, "build_comic_pack.py", "export", "--project", project_dir, "--out", out_zip], check=True)

print("Extracting zip to public directory so it updates the reader...")
public_dir = r"C:\Users\LENOVO\Documents\LearnChinese\ChunkyChineseVocab\public\comic-packs\dsx"
subprocess.run(["powershell", "-Command", f"Expand-Archive -Force -LiteralPath '{out_zip}' -DestinationPath '{public_dir}'"], check=True)

print("All done! The translations are live in the reader.")
