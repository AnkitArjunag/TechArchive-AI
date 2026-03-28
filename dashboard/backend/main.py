import requests #type: ignore
from fastapi import FastAPI, HTTPException, Depends, Request, UploadFile, File #type: ignore
from fastapi.middleware.cors import CORSMiddleware#type: ignore
from fastapi.responses import StreamingResponse #type: ignore
from pydantic import BaseModel#type: ignore
from typing import List
from fastapi.staticfiles import StaticFiles#type: ignore
from pymongo import MongoClient#type: ignore
from bson import ObjectId#type: ignore
from jose import jwt#type: ignore
import bcrypt#type: ignore
import json
import fitz#type: ignore

from sentence_transformers import CrossEncoder#type: ignore
from search import search, refresh_data

# ----------------------------------------------------
# CONFIG
# ----------------------------------------------------
SECRET_KEY = "secret123"
ALGORITHM = "HS256"

MONGO_URI = "mongodb+srv://arjunagiankit141:Ankit12112003@ankit.r17ffqd.mongodb.net/?appName=Ankit"

# ----------------------------------------------------
# INIT
# ----------------------------------------------------
app = FastAPI()

reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')

app.mount(
    "/docs",
    StaticFiles(directory=r"D:\BEL_2026\Journals"),
    name="docs"
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
        "password": hashed_pw.decode()
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
# THREADS (ALL FIXED WITH /api)
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

@app.put("/api/threads/{thread_id}")
def rename_thread(thread_id: str, data: dict, user_id=Depends(get_current_user)):
    threads_collection.update_one(
        {
            "_id": ObjectId(thread_id),
            "user_id": str(user_id)
        },
        {
            "$set": {"title": data.get("title", "Untitled")}
        }
    )

    return {"message": "Thread renamed"}

@app.delete("/api/threads/{thread_id}")
def delete_thread(thread_id: str, user_id=Depends(get_current_user)):
    threads_collection.delete_one(
        {
            "_id": ObjectId(thread_id),
            "user_id": str(user_id)
        }
    )

    return {"message": "Thread deleted"}

# ----------------------------------------------------
# PDF UPLOAD
# ----------------------------------------------------
@app.post("/api/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    try:
        from sentence_transformers import SentenceTransformer #type: ignore
        model = SentenceTransformer("all-MiniLM-L6-v2")

        doc = fitz.open(stream=await file.read(), filetype="pdf")

        new_chunks = []

        for page_num, page in enumerate(doc):
            text = page.get_text()

            for i in range(0, len(text), 500):
                chunk = text[i:i+500]

                if not chunk.strip():
                    continue

                embedding = model.encode(chunk).tolist()

                new_chunks.append({
                    "content": chunk,
                    "embedding": embedding,
                    "source": file.filename,
                    "page": page_num + 1
                })

        with open("vector_data.json", "r+", encoding="utf-8") as f:
            data = json.load(f)
            data.extend(new_chunks)
            f.seek(0)
            json.dump(data, f)

        refresh_data()

        return {"message": "PDF uploaded", "chunks": len(new_chunks)}

    except Exception as e:
        print("UPLOAD ERROR:", e)
        raise HTTPException(status_code=500, detail="Upload failed")

# ----------------------------------------------------
# INSIGHTS (FIXED)
# ----------------------------------------------------
@app.post("/api/insights")
def get_insights(request: ChatRequest):
    try:
        user_query = request.messages[-1].content
        results = search(user_query)

        insights = [
            {
                "content": r["content"],
                "source": r["source"],
                "page": r["page"]
            }
            for r in results
        ]

        return {"insights": insights}

    except Exception as e:
        print("INSIGHTS ERROR:", e)
        raise HTTPException(status_code=500, detail="Insights failed")

# ----------------------------------------------------
# CHAT (FIXED)
# ----------------------------------------------------
@app.post("/api/chat")
def chat_with_archive(request: ChatRequest):
    try:
        user_query = request.messages[-1].content

        # 🔍 Retrieve chunks
        results = search(user_query)

        # 📊 Rerank for better relevance
        pairs = [(user_query, r["content"]) for r in results]
        scores = reranker.predict(pairs)

        ranked = sorted(zip(results, scores), key=lambda x: x[1], reverse=True)

        # ✅ INCREASE CONTEXT (TOP 5 instead of 3)
        top_results = ranked[:5]

        # 📦 Build context
        context = "\n\n".join([r[0]["content"] for r in top_results])

        # 🧠 IMPROVED PROMPT (LESS STRICT)
        prompt = f"""
You are a smart research assistant.

Answer the question using the provided context.

Guidelines:
- Use the context as your PRIMARY source
- You MAY infer missing details if they are strongly implied
- Combine multiple context chunks if needed
- Keep the answer clear and helpful
- Do NOT introduce completely unrelated information

Context:
{context}

Question:
{user_query}

Answer:
"""

        # 🔄 STREAM RESPONSE FROM OLLAMA
        def generate():
            response = requests.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": "llama3.2:3b",
                    "prompt": prompt,
                    "stream": True
                },
                stream=True
            )

            for line in response.iter_lines():
                if line:
                    try:
                        data = json.loads(line.decode("utf-8"))
                        yield data.get("response", "")
                    except:
                        continue

        return StreamingResponse(generate(), media_type="text/plain")

    except Exception as e:
        print("CHAT ERROR:", e)
        raise HTTPException(status_code=500, detail="Chat failed")

# ----------------------------------------------------
# RUN
# ----------------------------------------------------
if __name__ == "__main__":
    import uvicorn #type: ignore
    uvicorn.run(app, host="0.0.0.0", port=8000)

