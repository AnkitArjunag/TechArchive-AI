import fitz
import pytesseract
from PIL import Image
import json
import os
import io

PDF_FOLDER = "Journals" \
"/"
OUTPUT_FOLDER = "output/"

FILES = [
    ("doc1", "doc1_cooling_sspa.pdf"),
    ("doc2", "doc2_weapon_params.pdf"),
    ("doc3", "doc3_rf_fingerprinting.pdf"),
    ("doc4", "doc4_ugv_navigation.pdf"),
    ("doc5", "doc5_rf_microwave_trends.pdf"),
    ("doc6", "doc6_digital_twin.pdf"),
    ("doc7", "doc7_defence_ecosystem.pdf"),
    ("doc8", "doc8_brain_computer.pdf"),
    ("doc9", "doc9_bio_toxins.pdf"),
    ("doc10","doc10_aircraft_aerodynamics.pdf"),
]


def ocr_page(page):
    pix = page.get_pixmap(dpi=300)
    img = Image.open(io.BytesIO(pix.tobytes("png")))
    text = pytesseract.image_to_string(img)
    return text


def process_pdf(doc_id, filename):
    pdf = fitz.open(os.path.join(PDF_FOLDER, filename))

    output = {
        "doc_id": doc_id,
        "pages": []
    }

    for page_num, page in enumerate(pdf, start=1):
        text = ocr_page(page)

        output["pages"].append({
            "page": page_num,
            "text": text
        })

    os.makedirs(f"{OUTPUT_FOLDER}/{doc_id}", exist_ok=True)
    with open(f"{OUTPUT_FOLDER}/{doc_id}/clean.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=4)

    print(f"[OK] OCR done for {doc_id}")


def main():
    for doc_id, name in FILES:
        process_pdf(doc_id, name)


if __name__ == "__main__":
    main()
