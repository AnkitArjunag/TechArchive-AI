import json
import os
from sentence_transformers import SentenceTransformer # type: ignore

# Load embedding model
model = SentenceTransformer("all-MiniLM-L6-v2")

# Path to your dataset folder
DATA_FOLDER = r"D:\BEL_2026\dataset"

all_data = []


# ----------------------------------------------------
# 🔥 CHUNKING FUNCTION (IMPORTANT)
# ----------------------------------------------------
def split_text(text, chunk_size=40):
    words = text.split()
    chunks = []

    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i:i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)

    return chunks


# ----------------------------------------------------
# 🔥 PROCESS ALL JSON FILES
# ----------------------------------------------------
for file in os.listdir(DATA_FOLDER):

    if file.endswith(".json"):

        file_path = os.path.join(DATA_FOLDER, file)
        print("Processing:", file)

        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        for item in data:

            text = item.get("clean_text", "")

            if not text.strip():
                continue

            # 🔥 Split into smaller chunks
            chunks = split_text(text)

            for chunk in chunks:

                embedding = model.encode(chunk).tolist()

                all_data.append({
                    "content": chunk,
                    "embedding": embedding,
                    "source": file,
                    "page": item.get("metadata", {}).get("pages", []),
                    "hardware": item.get("metadata", {}).get("hardware", [])
                })


# ----------------------------------------------------
# 🔥 SAVE FINAL VECTOR FILE
# ----------------------------------------------------
with open("vector_data.json", "w", encoding="utf-8") as f:
    json.dump(all_data, f)

print("\n✅ Vector DB created successfully!")
print("📊 Total chunks:", len(all_data))