from fastapi import APIRouter, UploadFile, File  # type: ignore
import fitz  # type: ignore
import json
import os
from sentence_transformers import SentenceTransformer  # type: ignore
from search import refresh_data
from utils.ocr import extract_text

router = APIRouter()
model = SentenceTransformer("all-MiniLM-L6-v2")

# 🔥 CREATE UPLOADS FOLDER
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    try:
        pdf_bytes = await file.read()

        # 🔥 SAVE FILE TO DISK
        file_path = os.path.join(UPLOAD_DIR, file.filename)

        with open(file_path, "wb") as f:
            f.write(pdf_bytes)

        # 🔥 OCR + TEXT EXTRACTION
        text, method = extract_text(pdf_bytes)

        print("✅ Extraction method:", method)

        new_chunks = []

        for i in range(0, len(text), 500):
            chunk = text[i:i+500]

            if not chunk.strip():
                continue

            embedding = model.encode(chunk).tolist()

            new_chunks.append({
                "content": chunk,
                "embedding": embedding,
                "source": file.filename,   # 🔥 used for opening PDF
                "page": 1                  # 🔥 FIX: prevents crash
            })

        with open("vector_data.json", "r+", encoding="utf-8") as f:
            data = json.load(f)
            data.extend(new_chunks)
            f.seek(0)
            json.dump(data, f)

        refresh_data()

        return {
            "message": "PDF uploaded",
            "chunks": len(new_chunks),
            "method": method
        }

    except Exception as e:
        print("UPLOAD ERROR:", e)
        return {"error": "Upload failed"}