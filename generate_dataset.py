import json
import os
import re
from openai import OpenAI

# LM STUDIO server
client = OpenAI(
    api_key="lm-studio",
    base_url="http://192.168.56.1:1234/v1"
)

MODEL_NAME = "google/gemma-3-4b"

OUTPUT_FOLDER = "output/"
DATASET_FOLDER = "dataset/"
os.makedirs(DATASET_FOLDER, exist_ok=True)

MAX_INPUT_CHARS = 600   # smaller = safer


###############################
# CLEAN OCR TEXT
###############################
def clean_text(text):
    # Remove weird Unicode (math symbols, OCR garbage)
    text = text.encode("ascii", "ignore").decode()

    # Remove long symbols (tables, equations)
    text = re.sub(r"[-=]{3,}", " ", text)

    # Remove non-printables
    text = re.sub(r"[^\x20-\x7E\n]", " ", text)

    # Remove long repeated characters
    text = re.sub(r"(.)\1{5,}", r"\1", text)

    # Collapse spaces
    text = re.sub(r"\s+", " ", text)

    return text.strip()


###############################
# LOCAL MODEL CALL
###############################
def llm(prompt):
    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2
    )
    return response.choices[0].message.content.strip()


###############################
# GENERATE SUMMARY + Q&A
###############################
def generate_dataset_item(text):
    prompt = f"""
Summarize and generate Q&A from this technical text:

{text}

Return JSON ONLY in this structure:

{{
  "summary_short": "<1 line>",
  "summary_medium": "<2 lines>",
  "summary_detailed": "<3-4 lines>",
  "qa": [
     {{"q": "...", "a": "..."}},
     {{"q": "...", "a": "..."}},
     {{"q": "...", "a": "..."}},
     {{"q": "...", "a": "..."}}
  ]
}}
"""

    raw = llm(prompt)

    try:
        return json.loads(raw)
    except:
        return {
            "summary_short": "",
            "summary_medium": "",
            "summary_detailed": "",
            "qa": [{"q": "raw_output", "a": raw}]
        }


###############################
# PROCESS ONE DOCUMENT
###############################
def process_document(doc_id):
    print(f"\nProcessing {doc_id}...\n")

    with open(f"{OUTPUT_FOLDER}/{doc_id}/chunks.json", "r", encoding="utf-8") as f:
        chunks_data = json.load(f)

    final_dataset = {"doc_id": doc_id, "chunks": []}

    for ch in chunks_data["chunks"]:
        print(f" → {ch['chunk_id']}")

        raw_text = ch["text"]
        cleaned = clean_text(raw_text)

        # Reduce length to avoid model crash
        safe_text = cleaned[:MAX_INPUT_CHARS]

        result = generate_dataset_item(safe_text)

        final_dataset["chunks"].append({
            "chunk_id": ch["chunk_id"],
            "section": ch["section"],
            "text": safe_text,
            "pages": ch.get("pages", []),
            "summary_short": result.get("summary_short", ""),
            "summary_medium": result.get("summary_medium", ""),
            "summary_detailed": result.get("summary_detailed", ""),
            "qa": result.get("qa", [])
        })

    out_path = f"{DATASET_FOLDER}/{doc_id}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(final_dataset, f, indent=4)

    print(f"\n[OK] Saved {doc_id} → {out_path}\n")


def main():
    docs = sorted([d for d in os.listdir(OUTPUT_FOLDER) if d.startswith("doc")])

    for d in docs:
        process_document(d)

    print("\n🎉 All documents processed with crash protection.\n")


if __name__ == "__main__":
    main()
