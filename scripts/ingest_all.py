import chromadb
import json
import os

# Identify where the script is located (D:\BEL_2026\scripts)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Move up one level to find the 'dataset' folder correctly
DATASET_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, "..", "dataset"))
# Create the database in the main root folder
DB_PATH = os.path.normpath(os.path.join(SCRIPT_DIR, "..", "techarchive_db"))

client = chromadb.PersistentClient(path=DB_PATH)
collection = client.get_or_create_collection(name="defense_research")

def ingest_data():
    if not os.path.exists(DATASET_DIR):
        print(f"❌ Error: Cannot find dataset folder at: {DATASET_DIR}")
        return

    for filename in os.listdir(DATASET_DIR):
        if filename.endswith(".json"):
            file_path = os.path.join(DATASET_DIR, filename)
            with open(file_path, 'r') as f:
                data = json.load(f)
                for entry in data:
                    # Indexing technical summaries for semantic retrieval
                    searchable_text = entry["summaries"]["detailed"]
                    
                    # Mapping engineering parameters as metadata
                    metadata = {
                        "source": filename,
                        "section": entry["section"],
                        "hardware": ", ".join(entry["metadata"]["hardware"]),
                        "pages": str(entry["metadata"]["pages"])
                    }
                    collection.add(
                        documents=[searchable_text],
                        metadatas=[metadata],
                        ids=[entry["chunk_id"]]
                    )
    print(f"🚀 TechArchive AI: 10-Document Archive ingested at {DB_PATH}")

if __name__ == "__main__":
    ingest_data()