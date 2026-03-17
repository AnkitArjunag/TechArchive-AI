from fastapi import APIRouter, Depends # type: ignore
from db import threads_collection
from utils.deps import get_current_user

router = APIRouter()

# CREATE THREAD
@router.post("/threads")
def create_thread(user=Depends(get_current_user)):

    thread = {
        "user_id": str(user["_id"]),
        "title": "New Chat",
        "messages": []
    }

    thread_id = threads_collection.insert_one(thread).inserted_id

    return {"thread_id": str(thread_id)}


# ADD MESSAGE
@router.post("/threads/{thread_id}/message")
def add_message(thread_id: str, message: dict, user=Depends(get_current_user)):

    threads_collection.update_one(
        {"_id": thread_id},
        {"$push": {"messages": message}}
    )

    return {"status": "ok"}