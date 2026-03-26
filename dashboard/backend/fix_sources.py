import json
import os

# 🔥 Folder where your PDFs are stored
PDF_FOLDER = r"D:\BEL_2026\Journals"

# Build mapping: doc10 → doc10_aircraft_aerodynamics.pdf
pdf_map = {}

for file in os.listdir(PDF_FOLDER):
    if file.endswith(".pdf"):
        key = file.split("_")[0]  # doc10
        pdf_map[key] = file

with open("vector_data.json", "r") as f:
    data = json.load(f)

for item in data:
    if item["source"].endswith(".json"):
        base = item["source"].split("_")[0]  # doc10

        if base in pdf_map:
            item["source"] = pdf_map[base]  # ✅ correct mapping

with open("vector_data.json", "w") as f:
    json.dump(data, f, indent=2)

print("✅ Fixed all sources with correct PDF mapping")