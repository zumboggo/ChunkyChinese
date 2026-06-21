import fitz
import os

pdf_path = r"C:\Users\LENOVO\Downloads\我家大师兄脑子有坑  1 -- 凌宇沫编绘; 凌宇沫 -- Di 1 ban, Beijing, 2018 -- 北京时代华文书局 -- isbn13 9787569925128 -- d5598f4f1ea1b09fa205e05dd39272af -- Anna’s Archive.pdf"
out_dir = r"C:\Users\LENOVO\Documents\LearnChinese\ChunkyChineseVocab\tools\comic-pack-builder\raw-images\dsx"

os.makedirs(out_dir, exist_ok=True)

print("Opening PDF...")
doc = fitz.open(pdf_path)
total = len(doc)
print(f"Found {total} pages. Extracting...")

for page_num in range(total):
    page = doc.load_page(page_num)
    # Extract images directly if possible, or render page
    # Since comics are mostly images, let's render the page to ensure we capture everything exactly as it looks.
    # dpi=300 gives good resolution for OCR.
    pix = page.get_pixmap(dpi=300)
    out_path = os.path.join(out_dir, f"page_{page_num:03d}.png")
    pix.save(out_path)
    if (page_num + 1) % 10 == 0:
        print(f"Extracted {page_num + 1}/{total} pages")

print("Done extracting!")
