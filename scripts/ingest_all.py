import chromadb # type: ignore
import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, "..", "dataset_micro"))
DB_PATH = os.path.normpath(os.path.join(SCRIPT_DIR, "..", "techarchive_db"))

client = chromadb.PersistentClient(path=DB_PATH)
collection = client.get_or_create_collection(name="defense_research")

def safe_get(entry, *keys):
    """Safely get nested keys; returns '' if not found."""
    val = entry
    for key in keys:
        if isinstance(val, dict) and key in val:
            val = val[key]
        else:
            return ""
    return val

def ingest_data():
    total = 0

    for filename in os.listdir(DATASET_DIR):
        if not filename.endswith(".json"):
            continue

        file_path = os.path.join(DATASET_DIR, filename)
        with open(file_path, "r", encoding="utf-8") as f:
            chunks = json.load(f)

        for entry in chunks:
            chunk_id = entry.get("chunk_id")
            if not chunk_id:
                continue  # skip corrupt/malformed items

            combined_text = " ".join([
                entry.get("clean_text", ""),
                safe_get(entry, "summaries", "short"),
                safe_get(entry, "summaries", "medium"),
                safe_get(entry, "summaries", "detailed"),
                " ".join([qa.get("question", "") + " " + qa.get("answer", "") 
                          for qa in entry.get("q_and_a", [])])
            ])

            metadata = {
                "section": entry.get("section"),
                "pages": safe_get(entry, "metadata", "pages"),
                "hardware": safe_get(entry, "metadata", "hardware"),
                "source": filename
            }

            collection.add(
                ids=[chunk_id],
                documents=[combined_text],
                metadatas=[metadata]
            )

            total += 1

        print(f"✔ Ingested {filename}")

    print(f"\n🚀 TOTAL CHUNKS INGESTED: {total}\n")

if __name__ == "__main__":
    ingest_data()