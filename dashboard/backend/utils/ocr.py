import fitz  # type: ignore # PyMuPDF
import pytesseract # type: ignore
from pdf2image import convert_from_bytes # type: ignore

# ---- SET TESSERACT PATH ----
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


# ---- NORMAL PDF TEXT EXTRACTION ----
def extract_text_from_pdf(pdf_bytes):
    text = ""

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")

        for page in doc:
            text += page.get_text()

    except Exception as e:
        print("❌ Normal extraction error:", e)

    return text


# ---- OCR EXTRACTION ----
def extract_text_with_ocr(pdf_bytes):
    text = ""

    try:
        images = convert_from_bytes(pdf_bytes)

        for i, img in enumerate(images):
            page_text = pytesseract.image_to_string(img)
            text += f"\n--- Page {i+1} ---\n{page_text}"

    except Exception as e:
        print("❌ OCR error:", e)

    return text


# ---- MAIN FUNCTION ----
def extract_text(pdf_bytes):
    text = extract_text_from_pdf(pdf_bytes)

    # If very little text → scanned PDF
    if len(text.strip()) < 50:
        print("⚠️ Using OCR fallback...")
        text = extract_text_with_ocr(pdf_bytes)
        return text, "ocr"

    return text, "normal"