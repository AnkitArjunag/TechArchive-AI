import os
import requests
from fastapi import FastAPI, HTTPException #
from fastapi.middleware.cors import CORSMiddleware #
from pydantic import BaseModel
from typing import List
import chromadb #

# 1. Initialize the FastAPI app BEFORE defining routes
app = FastAPI()

# 2. Configure CORS so your React frontend can communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Initialize ChromaDB
client = chromadb.PersistentClient(path="./techarchive_db")
collection = client.get_or_create_collection(name="defense_research")

# 4. Define Data Models for Multi-turn Chat
class Message(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]

# 5. Define Routes (Now 'app' is defined and safe to use)
@app.post("/chat")
async def chat_with_archive(request: ChatRequest):
    try:
        # 1. Retrieve the same data that populated your table
        user_query = request.messages[-1].content
        results = collection.query(query_texts=[user_query], n_results=10)
        
        # 2. Format the context with clear Source/Page markers
        context_parts = []
        for doc, meta in zip(results['documents'][0], results['metadatas'][0]):
            source_info = f"[SOURCE: {meta.get('source')} | PAGE: {meta.get('pages')}]"
            context_parts.append(f"{source_info}\n{doc}")
        
        knowledge_base = "\n\n---\n\n".join(context_parts)

        # 3. Enhanced Reasoning Prompt for local LLMs
        system_instruction = f"""
        [ROLE: DEFENSE ENGINEERING ASSISTANT]
        You must answer using ONLY the 'KNOWLEDGE BASE' below. 
        
        KNOWLEDGE BASE:
        {knowledge_base}
        
        RULES:
        1. If the query asks for a value (like SMT temp or CFO), search the KNOWLEDGE BASE for it.
        2. If found, report the value and the [SOURCE/PAGE] exactly.
        3. If NOT found, say "I cannot find specific data for [Query] in the current archive."
        """

        # 4. Construct the conversation string
        full_prompt = system_instruction + "\n\n"
        for msg in request.messages:
            full_prompt += f"{msg.role.upper()}: {msg.content}\n"
        full_prompt += "ASSISTANT:"

        # 5. Call local Ollama (ensure gemma:2b is running)
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": "gemma:2b", "prompt": full_prompt, "stream": False}
        )
        
        return {"answer": response.json().get("response")}

    except Exception as e:
        print(f"Reasoning Error: {e}")
        raise HTTPException(status_code=500, detail="Intelligence Hub encountered a reasoning error.")
    
@app.get("/search")
async def search_archive(q: str):
    """
    Retrieves technical chunks for the Automated Parameter Table.
    """
    try:
        # 1. Query ChromaDB for the top 5 relevant technical segments
        results = collection.query(query_texts=[q], n_results=5)
        
        formatted_results = []
        
        # 2. Iterate through documents and their associated metadata
        for i in range(len(results['documents'][0])):
            content = results['documents'][0][i]
            metadata = results['metadatas'][0][i]
            
            formatted_results.append({
                "hardware": metadata.get("hardware", "General Research"), # Extraction for the table
                "content": content,
                "source": metadata.get("source", "Unknown Doc"),
                "pages": metadata.get("pages", "N/A") # Critical for citations
            })
            
        return {"results": formatted_results}

    except Exception as e:
        print(f"Search Error: {e}")
        return {"results": [], "error": str(e)}

if __name__ == "__main__":
    import uvicorn # type: ignore
    uvicorn.run(app, host="0.0.0.0", port=8000)