import requests
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import chromadb
from fastapi.staticfiles import StaticFiles
from pymongo import MongoClient
from bson import ObjectId
import jwt
import bcrypt

# ----------------------------------------------------
# CONFIG
# ----------------------------------------------------
SECRET_KEY = "secret123"
ALGORITHM = "HS256"

MONGO_URI = "mongodb+srv://arjunagiankit141:Ankit12112003@ankit.r17ffqd.mongodb.net/?appName=Ankit"

# ----------------------------------------------------
# FastAPI Setup
# ----------------------------------------------------
app = FastAPI()

app.mount(
    "/docs",
    StaticFiles(directory=r"D:\BEL_2026\Journals"),
    name="docs"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------
# MongoDB Setup
# ----------------------------------------------------
client = MongoClient(MONGO_URI)
db = client["BEL"]

users_collection = db["users"]
threads_collection = db["threads"]

# ----------------------------------------------------
# ChromaDB
# ----------------------------------------------------
chroma_client = chromadb.PersistentClient(path="./techarchive_db")
collection = chroma_client.get_or_create_collection(name="defense_research")

# ----------------------------------------------------
# Models
# ----------------------------------------------------
class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]


class User(BaseModel):
    name: str
    email: str
    password: str


class Login(BaseModel):
    email: str
    password: str

# ----------------------------------------------------
# AUTH HELPERS
# ----------------------------------------------------
def create_token(user_id):
    return jwt.encode(
        {"user_id": str(user_id)},
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def get_current_user(request: Request):
    try:
        auth = request.headers.get("Authorization")

        if not auth:
            raise HTTPException(status_code=401, detail="No token provided")

        token = auth.split(" ")[1]

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        return payload["user_id"]

    except Exception as e:
        print("AUTH ERROR:", e)
        raise HTTPException(status_code=401, detail="Unauthorized")

# ----------------------------------------------------
# AUTH ROUTES
# ----------------------------------------------------
@app.post("/api/register")
def register(user: User):

    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="User already exists")

    hashed_pw = bcrypt.hashpw(
        user.password.encode("utf-8"),
        bcrypt.gensalt()
    )

    new_user = {
        "name": user.name,
        "email": user.email,
        "password": hashed_pw.decode("utf-8")
    }

    result = users_collection.insert_one(new_user)

    token = create_token(result.inserted_id)

    return {"token": token}


@app.post("/api/login")
def login(data: Login):

    user = users_collection.find_one({"email": data.email})

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    stored_password = user["password"].encode("utf-8")

    if not bcrypt.checkpw(
        data.password.encode("utf-8"),
        stored_password
    ):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(user["_id"])

    return {"token": token}

# ----------------------------------------------------
# THREADS
# ----------------------------------------------------
@app.get("/threads")
def get_threads(user_id=Depends(get_current_user)):

    threads = list(threads_collection.find({"user_id": user_id}))

    for t in threads:
        t["_id"] = str(t["_id"])

    return {"threads": threads}


@app.post("/threads")
def create_thread(user_id=Depends(get_current_user)):

    new_thread = {
        "user_id": user_id,
        "title": "New Chat",
        "messages": []
    }

    result = threads_collection.insert_one(new_thread)

    return {"thread_id": str(result.inserted_id)}


@app.post("/threads/{thread_id}/message")
def add_message(thread_id: str, message: Message, user_id=Depends(get_current_user)):

    if not ObjectId.is_valid(thread_id):
        raise HTTPException(status_code=400, detail="Invalid thread ID")

    threads_collection.update_one(
        {"_id": ObjectId(thread_id)},
        {"$push": {"messages": message.dict()}}
    )

    return {"status": "ok"}

# ----------------------------------------------------
# RAG RETRIEVAL
# ----------------------------------------------------
def retrieve_chunks(query: str):

    # 🔥 Increased retrieval size
    results = collection.query(
        query_texts=[query],
        n_results=20
    )

    return results

# ----------------------------------------------------
# CHAT (FINAL FIXED)
# ----------------------------------------------------
@app.post("/chat")
def chat_with_archive(request: ChatRequest):

    try:
        user_query = request.messages[-1].content

        print("\nUSER QUERY:", user_query)

        results = retrieve_chunks(user_query)

        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]

        print("DOCS FOUND:", len(docs))

        # ❌ If no docs → early return
        if not docs:
            return {
                "answer": "Not available in documents.",
                "insights": []
            }

        context_parts = []
        insights = []

        # 🔥 Take top 6 (not too small)
        for doc, meta in zip(docs[:6], metas[:6]):

            source = meta.get("source", "doc")
            page = meta.get("pages") or meta.get("page") or 1

            context_parts.append(
                f"[SOURCE: {source} | PAGE: {page}]\n{doc}"
            )

            insights.append({
                "content": doc,
                "source": source,
                "page": page
            })

        knowledge_base = "\n\n---\n\n".join(context_parts)

        system_prompt = f"""
You are a defense engineering research assistant.

Answer ONLY using the context below.
If the answer is not present, say:
"Not available in documents."

CONTEXT:
{knowledge_base}
"""

        prompt = system_prompt + "\n\n"

        for msg in request.messages:
            prompt += f"{msg.role.upper()}: {msg.content}\n"

        prompt += "ASSISTANT:"

        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llama3.2:3b",
                "prompt": prompt,
                "stream": False
            }
        )

        answer = response.json().get("response", "")

        return {
            "answer": answer,
            "insights": insights
        }

    except Exception as e:
        print("RAG ERROR:", e)
        raise HTTPException(status_code=500, detail="Chat failed")

# ----------------------------------------------------
# SEARCH
# ----------------------------------------------------
@app.get("/search")
def search_archive(q: str):

    try:
        results = collection.query(
            query_texts=[q],
            n_results=10
        )

        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]

        formatted = []

        for i, (doc, meta) in enumerate(zip(docs, metas)):

            page = meta.get("pages") or meta.get("page") or 1

            formatted.append({
                "hardware": meta.get("hardware", "General"),
                "content": doc,
                "source": meta.get("source", f"doc{i+1}"),
                "pages": page
            })

        return {"results": formatted}

    except Exception as e:
        print("Search Error:", e)
        return {"results": []}

# ----------------------------------------------------
# RUN
# ----------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)