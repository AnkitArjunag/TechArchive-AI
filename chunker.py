import json
import os
import re

OUTPUT_FOLDER = "output/"
CHUNK_MIN_WORDS = 120
CHUNK_MAX_WORDS = 260


def detect_section(line):
    line_stripped = line.strip()

    # Explicit keywords
    if line_stripped.lower() in ["abstract", "introduction", "conclusion"]:
        return line_stripped

    # Numbered headings (1., 1.1., 2.2.3)
    if re.match(r"^[0-9]+\.", line_stripped):
        return line_stripped

    # ALL CAPS headings
    if line_stripped.isupper() and len(line_stripped) > 3:
        return line_stripped

    # Title Case headings
    if line_stripped.istitle() and 5 < len(line_stripped) < 80:
        return line_stripped

    # Ends with colon → often a heading
    if line_stripped.endswith(":") and len(line_stripped) < 80:
        return line_stripped

    return None


def chunk_text(text):
    words = text.split()
    if len(words) <= CHUNK_MAX_WORDS:
        return [text]

    chunks = []
    start = 0

    while start < len(words):
        end = min(start + CHUNK_MAX_WORDS, len(words))
        chunk_words = words[start:end]
        chunk = " ".join(chunk_words).strip()
        chunks.append(chunk)
        start = end

    return chunks


def process_doc(doc_id):
    clean_path = f"{OUTPUT_FOLDER}/{doc_id}/clean.json"
    with open(clean_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    chunks = []
    chunk_id_num = 1

    for page in data["pages"]:
        text = page["text"]

        lines = text.split("\n")
        current_section = "Unknown Section"
        buffer = []

        for line in lines:
            line = line.strip()

            if not line:
                continue

            candidate = detect_section(line)

            # If detected new section → flush old buffer
            if candidate:
                if buffer:
                    section_text = " ".join(buffer).strip()
                    if len(section_text.split()) >= 30:

                        for ch in chunk_text(section_text):
                            chunks.append({
                                "chunk_id": f"{doc_id}_C{chunk_id_num}",
                                "section": current_section,
                                "text": ch,
                                "pages": [page["page"]]
                            })
                            chunk_id_num += 1

                current_section = candidate
                buffer = []
            else:
                buffer.append(line)

        # flush at end of page
        if buffer:
            section_text = " ".join(buffer).strip()
            if len(section_text.split()) >= 30:
                for ch in chunk_text(section_text):
                    chunks.append({
                        "chunk_id": f"{doc_id}_C{chunk_id_num}",
                        "section": current_section,
                        "text": ch,
                        "pages": [page["page"]]
                    })
                    chunk_id_num += 1

    # Save chunks.json
    out_path = f"{OUTPUT_FOLDER}/{doc_id}/chunks.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"doc_id": doc_id, "chunks": chunks}, f, indent=4)

    print(f"[OK] Chunking completed for {doc_id}")


def main():
    docs = [d for d in os.listdir(OUTPUT_FOLDER) if d.startswith("doc")]
    docs.sort()

    for doc in docs:
        print(f"Processing chunks for {doc}...")
        process_doc(doc)


if __name__ == "__main__":
    main()
    