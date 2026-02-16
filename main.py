from fastapi import FastAPI, Query, HTTPException  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from pydantic import BaseModel  # type: ignore
import chromadb  # type: ignore
import requests
import os

app = FastAPI(title="TechArchive AI: Intelligence Hub")

# Enable CORS for your React Dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect to the Technical Brain (Vector Store)
DB_PATH = "./techarchive_db"
client = chromadb.PersistentClient(path=DB_PATH)
collection = client.get_collection(name="defense_research")


class ChatRequest(BaseModel):
    user_query: str


@app.get("/")
def root():
    return {"message": "TechArchive AI Backend is Live (Ollama Powered 🚀)"}


@app.get("/search")
async def search_archive(q: str = Query(..., description="Technical query")):
    """
    Performs semantic retrieval for the Parameter Table.
    """
    results = collection.query(query_texts=[q], n_results=5)

    formatted_results = []
    for i in range(len(results['documents'][0])):
        formatted_results.append({
            "chunk_id": results['ids'][0][i],
            "content": results['documents'][0][i],
            "source": results['metadatas'][0][i]['source'],
            "hardware": results['metadatas'][0][i]['hardware'],
            "pages": results['metadatas'][0][i]['pages']
        })

    return {"results": formatted_results}


@app.post("/chat")
async def chat_with_archive(request: ChatRequest):
    try:
        # 1️⃣ Check if DB has data
        if collection.count() == 0:
            return {"answer": "Error: The vector database is empty."}

        print(f"User Query: {request.user_query}")

        # 2️⃣ Retrieve relevant context from Chroma
        query_results = collection.query(
            query_texts=[request.user_query],
            n_results=3
        )

        context_text = "\n\n".join(query_results['documents'][0])

        # 3️⃣ Build RAG Prompt
        prompt = f"""
You are a defense electronics expert.

Use ONLY the context below to answer.
If the answer is not present in the context, say:
"Information not found in database."

Question:
{request.user_query}

Context:
{context_text}
"""

        print("Sending to Ollama...")

        # 4️⃣ Send to Ollama Local LLM
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llama3",  # Change to "phi3" if using that
                "prompt": prompt,
                "stream": False
            }
        )

        if response.status_code != 200:
            raise Exception(f"Ollama Error: {response.text}")

        answer = response.json()["response"]

        return {"answer": answer}

    except Exception as e:
        print("\n" + "=" * 50)
        print("INTERNAL SERVER ERROR DETAILS:")
        print(f"Error Type: {type(e).__name__}")
        print(f"Message: {str(e)}")
        print("=" * 50 + "\n")

        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn  # type: ignore
    uvicorn.run(app, host="0.0.0.0", port=8000)
