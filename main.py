import requests # type: ignore
from fastapi import FastAPI, HTTPException # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from pydantic import BaseModel # type: ignore
from typing import List
import chromadb # type: ignore

# ----------------------------------------------------
# FastAPI Setup
# ----------------------------------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------
# ChromaDB
# ----------------------------------------------------
client = chromadb.PersistentClient(path="./techarchive_db")
collection = client.get_or_create_collection(name="defense_research")

# ----------------------------------------------------
# Data Models
# ----------------------------------------------------
class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]


# ----------------------------------------------------
# Retrieval Function
# ----------------------------------------------------
def retrieve_chunks(query: str):

    results = collection.query(
        query_texts=[query],
        n_results=8   # slightly higher recall
    )

    # Debugging output (very useful)
    print("\n==== RETRIEVED CHUNKS ====")

    for i, doc in enumerate(results["documents"][0]):
        print(f"\nChunk {i+1}")
        print(doc[:250])

    return results


# ----------------------------------------------------
# Chat Endpoint
# ----------------------------------------------------
@app.post("/chat")
async def chat_with_archive(request: ChatRequest):

    try:
        user_query = request.messages[-1].content

        # Retrieve relevant chunks
        results = retrieve_chunks(user_query)

        # ✅ FIXED: do NOT index twice
        docs = results["documents"][0]
        metas = results["metadatas"][0]

        # Only send top 4 chunks to LLM
        docs = docs[:4]
        metas = metas[:4]

        context_parts = []

        for doc, meta in zip(docs, metas):

            source = meta.get("source", "unknown")
            pages = meta.get("pages", "N/A")

            context_parts.append(
                f"[SOURCE: {source} | PAGE: {pages}]\n{doc}"
            )

        knowledge_base = "\n\n---\n\n".join(context_parts)

        # ------------------------------------------------
        # Prompt for Local LLM
        # ------------------------------------------------
        system_prompt = f"""
You are a defense engineering research assistant.

Answer the question using ONLY the context below.

CONTEXT:
{knowledge_base}

Rules:
- Extract the answer directly from the context.
- Include the SOURCE and PAGE.
- Do NOT say the answer is missing if it exists.
- If the answer truly does not exist, say:
"I cannot find this information in the archive."
"""

        # Build conversation
        prompt = system_prompt + "\n\n"

        for msg in request.messages:
            prompt += f"{msg.role.upper()}: {msg.content}\n"

        prompt += "ASSISTANT:"

        # ------------------------------------------------
        # Call Ollama
        # ------------------------------------------------
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llama3.2:3b",
                "prompt": prompt,
                "stream": False,
                "temperature": 0.2
            },
            timeout=120
        )

        return {"answer": response.json().get("response", "")}

    except Exception as e:
        print("RAG ERROR:", e)
        raise HTTPException(status_code=500, detail="Chat processing failed")


# ----------------------------------------------------
# Search Endpoint (Parameter Table)
# ----------------------------------------------------
@app.get("/search")
async def search_archive(q: str):

    try:
        results = collection.query(query_texts=[q], n_results=5)

        formatted_results = []

        for doc, meta in zip(results["documents"][0], results["metadatas"][0]):

            formatted_results.append({
                "hardware": meta.get("hardware", "General Research"),
                "content": doc,
                "source": meta.get("source", "Unknown"),
                "pages": meta.get("pages", "N/A")
            })

        return {"results": formatted_results}

    except Exception as e:
        print("Search Error:", e)
        return {"results": []}


# ----------------------------------------------------
# Run Server
# ----------------------------------------------------
if __name__ == "__main__":
    import uvicorn # type: ignore
    uvicorn.run(app, host="0.0.0.0", port=8000)