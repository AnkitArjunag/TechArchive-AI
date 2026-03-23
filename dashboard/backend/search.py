import json
import numpy as np #type: ignore
from sentence_transformers import SentenceTransformer #type: ignore
from sklearn.metrics.pairwise import cosine_similarity #type: ignore

model = None
data = None
embeddings = None


def load_resources():
    global model, data, embeddings

    if model is None:
        print("🔄 Loading model...")
        model = SentenceTransformer("all-MiniLM-L6-v2")

    if data is None:
        print("🔄 Loading vector DB...")
        with open("vector_data.json", "r", encoding="utf-8") as f:
            data = json.load(f)

        embeddings = np.array([item["embedding"] for item in data])


def refresh_data():
    global data, embeddings
    data = None
    embeddings = None


def search(query, top_k=5):
    try:
        load_resources()

        query_embedding = model.encode(query)

        similarities = cosine_similarity(
            [query_embedding],
            embeddings
        )[0]

        top_indices = np.argsort(similarities)[::-1][:top_k]

        return [data[i] for i in top_indices]

    except Exception as e:
        print("SEARCH ERROR:", e)
        return []