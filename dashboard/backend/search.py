import json
import numpy as np # type: ignore
from sentence_transformers import SentenceTransformer #type: ignore
from sklearn.metrics.pairwise import cosine_similarity #type: ignore

# Load model ONCE
model = SentenceTransformer("all-MiniLM-L6-v2")

# Load vector database
with open("vector_data.json", "r", encoding="utf-8") as f:
    data = json.load(f)


def search(query, top_k=5):
    try:
        # Convert query to embedding
        query_embedding = model.encode(query)

        scores = []

        for item in data:
            score = cosine_similarity(
                [query_embedding],
                [item["embedding"]]
            )[0][0]

            scores.append((score, item))

        # Sort by similarity
        scores.sort(reverse=True, key=lambda x: x[0])

        # Return top_k results
        return [item for _, item in scores[:top_k]]

    except Exception as e:
        print("SEARCH ERROR:", e)
        return []