import requests # type: ignore
from fastapi import FastAPI, HTTPException, Depends, Request, UploadFile, File # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from fastapi.responses import StreamingResponse # type: ignore
from pydantic import BaseModel  # type: ignore
from typing import List
from fastapi.staticfiles import StaticFiles # type: ignore
from pymongo import MongoClient # type: ignore
from bson import ObjectId # type: ignore
from jose import jwt # type: ignore
import bcrypt # type: ignore
import json
from utils.ocr import extract_text
import time # type: ignore
import fitz # type: ignore
from datetime import datetime, time
import os   # ✅ ADDED

from sentence_transformers import CrossEncoder # type: ignore
from search import search, refresh_data

# ----------------------------------------------------
# CONFIG
# ----------------------------------------------------
SECRET_KEY = "secret123"
ALGORITHM = "HS256"

MONGO_URI = "mongodb+srv://arjunagiankit141:Ankit12112003@ankit.r17ffqd.mongodb.net/?appName=Ankit"

# ✅ NEW (UPLOAD DIR)
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ----------------------------------------------------
# INIT
# ----------------------------------------------------
app = FastAPI()

from routes.user import router as user_router
app.include_router(user_router, prefix="/api")
reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')

app.mount(
    "/docs",
    StaticFiles(directory=r"D:\BEL_2026\Journals"),
    name="docs"
)

# ✅ NEW (SERVE UPLOADED FILES)
app.mount(
    "/uploads",
    StaticFiles(directory="uploads"),
    name="uploads"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------
# DB
# ----------------------------------------------------
client = MongoClient(MONGO_URI)
db = client["BEL"]

users_collection = db["users"]
threads_collection = db["threads"]

# ----------------------------------------------------
# MODELS
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
# AUTH
# ----------------------------------------------------
def create_token(user_id):
    return jwt.encode({"user_id": str(user_id)}, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(request: Request):
    auth = request.headers.get("Authorization")

    if not auth:
        raise HTTPException(status_code=401, detail="No token")

    token = auth.split(" ")[1]

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload["user_id"]
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

# ----------------------------------------------------
# AUTH ROUTES
# ----------------------------------------------------
@app.post("/api/register")
def register(user: User):
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="User exists")

    hashed_pw = bcrypt.hashpw(user.password.encode(), bcrypt.gensalt())

    users_collection.insert_one({
        "name": user.name,
        "email": user.email,
        "password": hashed_pw.decode(),
        "created_at": datetime.utcnow()
    })

    return {"message": "User created successfully"}


@app.post("/api/login")
def login(data: Login):
    user = users_collection.find_one({"email": data.email})

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not bcrypt.checkpw(data.password.encode(), user["password"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(user["_id"])

    return {"token": token}

# ----------------------------------------------------
# THREADS
# ----------------------------------------------------
@app.get("/api/threads")
def get_threads(user_id=Depends(get_current_user)):
    threads = list(threads_collection.find({"user_id": str(user_id)}))

    for t in threads:
        t["_id"] = str(t["_id"])
        t["messages"] = t.get("messages", [])

    return {"threads": threads}


@app.post("/api/threads")
def create_thread(user_id=Depends(get_current_user)):
    thread = {
        "user_id": str(user_id),
        "title": "New Chat",
        "messages": []
    }

    result = threads_collection.insert_one(thread)

    return {"thread_id": str(result.inserted_id)}


@app.get("/api/threads/{thread_id}")
def get_thread(thread_id: str, user_id=Depends(get_current_user)):
    thread = threads_collection.find_one({
        "_id": ObjectId(thread_id),
        "user_id": str(user_id)
    })

    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    thread["_id"] = str(thread["_id"])
    thread["messages"] = thread.get("messages", [])

    return thread


@app.post("/api/threads/{thread_id}/message")
def add_message(thread_id: str, message: dict, user_id=Depends(get_current_user)):

    thread = threads_collection.find_one({
        "_id": ObjectId(thread_id),
        "user_id": str(user_id)
    })

    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    existing_messages = thread.get("messages", [])

    if message["role"] == "user" and len(existing_messages) == 0:
        title = message["content"].strip().capitalize()[:40]

        threads_collection.update_one(
            {"_id": ObjectId(thread_id)},
            {"$set": {"title": title}}
        )

    threads_collection.update_one(
        {
            "_id": ObjectId(thread_id),
            "user_id": str(user_id)
        },
        {
            "$push": {"messages": message}
        }
    )

    return {"message": "Message added"}


@app.delete("/api/threads/{thread_id}")
def delete_thread(thread_id: str, user_id=Depends(get_current_user)):
    threads_collection.delete_one({
        "_id": ObjectId(thread_id),
        "user_id": str(user_id)
    })

    return {"message": "Thread deleted"}


# ----------------------------------------------------
# PDF UPLOAD (ONLY THIS PART MODIFIED)
# ----------------------------------------------------
@app.post("/api/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    try:
        from sentence_transformers import SentenceTransformer # type: ignore
        model = SentenceTransformer("all-MiniLM-L6-v2")

        pdf_bytes = await file.read()

        # SAVE FILE
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as f:
            f.write(pdf_bytes)

        text, method = extract_text(pdf_bytes)

        new_chunks = []

        chunk_size = 500
        approx_chars_per_page = 3000

        for i in range(0, len(text), chunk_size):
            chunk = text[i:i+chunk_size]

            if not chunk.strip():
                continue

            # 🔥 PAGE CALCULATION
            page_number = (i // approx_chars_per_page) + 1

            embedding = model.encode(chunk).tolist()

            new_chunks.append({
                "content": chunk,
                "embedding": embedding,
                "source": file.filename,
                "page": page_number
            })

        with open("vector_data.json", "r+", encoding="utf-8") as f:
            data = json.load(f)
            data.extend(new_chunks)
            f.seek(0)
            json.dump(data, f)

        refresh_data()

        return {
            "message": "PDF uploaded",
            "chunks": len(new_chunks),
            "method": method
        }

    except Exception as e:
        print("UPLOAD ERROR:", e)
        raise HTTPException(status_code=500, detail="Upload failed")

# ----------------------------------------------------
# INSIGHTS (FIXED NORMALIZATION)
# ----------------------------------------------------# ONLY SHOWING CHANGED PARTS (REST SAME)

# ----------------------------------------------------
# HELPER: FILTER RESULTS BASED ON QUERY
# ----------------------------------------------------
def filter_results(query, results):
    q = query.lower()

    # UAV vs UGV disambiguation
    if "uav" in q or "aerial" in q:
        return [r for r in results if "uav" in r["content"].lower() or "aerial" in r["content"].lower()]

    if "ugv" in q or "ground vehicle" in q:
        return [r for r in results if "ugv" in r["content"].lower()]

    return results


# ----------------------------------------------------
# INSIGHTS (UPDATED)
# ----------------------------------------------------
@app.post("/api/insights")
def get_insights(request: ChatRequest):
    user_query = request.messages[-1].content

    results = search(user_query)

    # 🔥 NEW FILTER
    results = filter_results(user_query, results)

    if not results:
        return {"insights": []}

    pairs = [(user_query, r["content"]) for r in results]
    scores = reranker.predict(pairs)

    min_s, max_s = min(scores), max(scores)

    insights = []
    for r, s in zip(results, scores):
        norm = 0.5 if max_s == min_s else (s - min_s) / (max_s - min_s)

        insights.append({
            "content": r["content"],
            "source": r["source"],
            "page": r.get("page", 1),
            "score": float(norm)
        })

    insights.sort(key=lambda x: x["score"], reverse=True)

    return {"insights": insights[:5]}

# ----------------------------------------------------
# GET CURRENT USER
# ----------------------------------------------------
@app.get("/api/me")
def get_me(user_id=Depends(get_current_user)):
    user = users_collection.find_one({"_id": ObjectId(user_id)})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "name": user.get("name", ""),
        "email": user.get("email", "")
    }


# ----------------------------------------------------
# CHAT (UPDATED)
# ----------------------------------------------------
@app.post("/api/chat")
def chat(request: ChatRequest):
    user_query = request.messages[-1].content

    results = search(user_query)

    # 🔥 NEW FILTER
    results = filter_results(user_query, results)

    if not results:
        def fallback():
            yield "I could not find relevant information in the documents."
        return StreamingResponse(fallback(), media_type="text/plain")

    pairs = [(user_query, r["content"]) for r in results]
    scores = reranker.predict(pairs)

    ranked = sorted(zip(results, scores), key=lambda x: x[1], reverse=True)
    top = [r[0] for r in ranked[:8]]
    if not top:
        def fallback():
            yield "I could not find relevant information in the documents."
        return StreamingResponse(fallback(), media_type="text/plain")   
    context = "\n\n".join([r["content"] for r in top])

    # ⚠️ PROMPT UNCHANGED (as requested)
    prompt = f"""
You are a research assistant.

Answer the question using ONLY the provided context.

Instructions:
- Use ONLY the given context to generate the answer
- DO NOT use any external knowledge
- DO NOT make assumptions or add general knowledge
- If the answer is not explicitly present in the context, respond EXACTLY with:
  "I could not find relevant information in the documents."
- Do NOT add any explanation before or after that sentence
- Keep the answer concise (3–5 lines)
- Combine relevant points from the context if available

Context:
{context}

Question:
{user_query}

Answer:
"""

    def generate():
        res = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": "llama3.2:3b", "prompt": prompt, "stream": True},
            stream=True
        )

        full_text = ""

        for line in res.iter_lines():
            if line:
                try:
                    data = json.loads(line.decode("utf-8"))
                    chunk = data.get("response", "")
                    full_text += chunk
                    yield chunk
                except:
                    continue

    return StreamingResponse(generate(), media_type="text/plain")


# ----------------------------------------------------
# RUN
# ----------------------------------------------------
if __name__ == "__main__":
    import uvicorn # type: ignore
    uvicorn.run(app, host="0.0.0.0", port=8000)