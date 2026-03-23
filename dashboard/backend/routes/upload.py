from fastapi import APIRouter, UploadFile, File #    type: ignore
import fitz # type: ignore # PyMuPDF, for PDF processing, type: ignore
import json
from sentence_transformers import SentenceTransformer #    type: ignore
from search import refresh_data

router = APIRouter()
model = SentenceTransformer("all-MiniLM-L6-v2")


@router.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    try:
        doc = fitz.open(stream=await file.read(), filetype="pdf")

        new_chunks = []

        for page_num, page in enumerate(doc):
            text = page.get_text()

            for i in range(0, len(text), 500):
                chunk = text[i:i+500]

                embedding = model.encode(chunk).tolist()

                new_chunks.append({
                    "content": chunk,
                    "embedding": embedding,
                    "source": file.filename,
                    "page": page_num + 1
                })

        with open("vector_data.json", "r+", encoding="utf-8") as f:
            data = json.load(f)
            data.extend(new_chunks)
            f.seek(0)
            json.dump(data, f)

        refresh_data()

        return {"message": "PDF uploaded", "chunks": len(new_chunks)}

    except Exception as e:
        print("UPLOAD ERROR:", e)
        return {"error": "Upload failed"}