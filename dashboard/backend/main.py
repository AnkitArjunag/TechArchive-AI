import requests 
from fastapi import FastAPI, HTTPException, Depends, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from fastapi.staticfiles import StaticFiles
from pymongo import MongoClient
from bson import ObjectId
from jose import JWTError, jwt
import bcrypt
import json
import fitz

from search import search, refresh_data

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
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
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
# THREADS
# ----------------------------------------------------
@app.get("/threads")
def get_threads(user_id=Depends(get_current_user)):
    # 🔥 FIX: user_id must be string
    threads = list(threads_collection.find({"user_id": str(user_id)}))

    for t in threads:
        t["_id"] = str(t["_id"])
        t["messages"] = t.get("messages", [])

    return {"threads": threads}


@app.post("/threads")
def create_thread(user_id=Depends(get_current_user)):
    # 🔥 FIX: ensure user_id is string
    thread = {
        "user_id": str(user_id),
        "title": "New Chat",
        "messages": []
    }

    result = threads_collection.insert_one(thread)

    return {"thread_id": str(result.inserted_id)}


@app.get("/threads/{thread_id}")
def get_thread(thread_id: str, user_id=Depends(get_current_user)):
    thread = threads_collection.find_one({
        "_id": ObjectId(thread_id),
        "user_id": str(user_id)   # 🔥 FIX
    })

    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    thread["_id"] = str(thread["_id"])
    thread["messages"] = thread.get("messages", [])

    return thread

@app.post("/threads/{thread_id}/message")
def add_message(thread_id: str, message: dict, user_id=Depends(get_current_user)):
    try:
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

    except Exception as e:
        print("ADD MESSAGE ERROR:", e)
        raise HTTPException(status_code=500, detail="Failed to add message")


# ----------------------------------------------------
# PDF UPLOAD
# ----------------------------------------------------
@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer("all-MiniLM-L6-v2")

        doc = fitz.open(stream=await file.read(), filetype="pdf")

        new_chunks = []

        for page_num, page in enumerate(doc):
            text = page.get_text()

            for i in range(0, len(text), 500):
                chunk = text[i:i+500]

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
# CHAT
# ----------------------------------------------------
@app.post("/chat")
def chat_with_archive(request: ChatRequest):
    try:
        # 🔥 FIX: validate input
        if not request.messages:
            raise HTTPException(status_code=400, detail="No messages")

        user_query = request.messages[-1].content
        results = search(user_query)

        if not results:
            return {"answer": "Not available", "insights": []}

        context = "\n\n".join([r["content"] for r in results])

        prompt = f"""
Answer ONLY using context.

Context:
{context}

Question:
{user_query}
"""

        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llama3.2:3b",
                "prompt": prompt,
                "stream": False
            }
        )

        answer = response.json().get("response", "")

        insights = [
            {
                "content": r["content"],
                "source": r["source"],
                "page": r["page"]
            }
            for r in results
        ]

        return {"answer": answer, "insights": insights}

    except Exception as e:
        print("CHAT ERROR:", e)
        raise HTTPException(status_code=500, detail="Chat failed")

# ----------------------------------------------------
# RUN
# ----------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)