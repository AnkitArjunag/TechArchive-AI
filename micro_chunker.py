import os
import json
import nltk # type: ignore
from nltk.tokenize import sent_tokenize # type: ignore
import uuid

nltk.download('punkt')

INPUT_DIR = "dataset"
OUTPUT_DIR = "dataset_micro"

os.makedirs(OUTPUT_DIR, exist_ok=True)

CHUNK_SIZE = 450   # Target micro-chunk size


def split_into_micro_chunks(text, target_size=CHUNK_SIZE):
    sentences = sent_tokenize(text)
    chunks = []
    current = ""

    for sentence in sentences:
        if len(current) + len(sentence) < target_size:
            current += " " + sentence
        else:
            chunks.append(current.strip())
            current = sentence

    if current:
        chunks.append(current.strip())

    return chunks


def auto_summary(text):
    # Basic heuristic summaries (no LLM needed)
    words = text.split()

    short = " ".join(words[:20]) + "..."
    medium = " ".join(words[:40]) + "..."
    detailed = " ".join(words[:80]) + "..."

    return short, medium, detailed


def process_file(filename):
    input_path = os.path.join(INPUT_DIR, filename)
    output_path = os.path.join(OUTPUT_DIR, filename)

    with open(input_path, "r", encoding="utf-8") as f:
        chunks = json.load(f)

    new_chunks = []

    for entry in chunks:
        base_id = entry["chunk_id"]
        clean = entry.get("clean_text", "")

        micro_chunks = split_into_micro_chunks(clean)

        for idx, mc in enumerate(micro_chunks):
            short, medium, detailed = auto_summary(mc)

            new_entry = {
                "chunk_id": f"{base_id}_M{idx}",
                "section": entry.get("section"),
                "clean_text": mc,
                "summaries": {
                    "short": short,
                    "medium": medium,
                    "detailed": detailed
                },
                "structured_parameters": entry.get("structured_parameters", {}),
                "q_and_a": entry.get("q_and_a", []),
                "metadata": entry.get("metadata", {})
            }

            new_chunks.append(new_entry)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(new_chunks, f, indent=2)

    print(f"✔ Micro-chunked: {filename} → {len(new_chunks)} chunks")


def main():
    files = [f for f in os.listdir(INPUT_DIR) if f.endswith(".json")]

    for f in files:
        process_file(f)

    print("\n🚀 Micro-chunking COMPLETE.\n")


if __name__ == "__main__":
    main()
