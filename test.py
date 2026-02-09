import fitz
doc = fitz.open("Journals/doc1_cooling_sspa.pdf")
print(doc[0].get_text())
