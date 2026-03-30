from fastapi import HTTPException # type: ignore

from fastapi import APIRouter, Depends, Request  # type: ignore
from bson import ObjectId  # type: ignore
import bcrypt  # type: ignore

router = APIRouter()


# ✅ AUTH HELPER
def get_current_user(request: Request):
    from main import SECRET_KEY, ALGORITHM
    from jose import jwt  # type: ignore

    auth = request.headers.get("Authorization")

    if not auth:
        raise HTTPException(status_code=401, detail="No token provided")

    try:
        token = auth.split(" ")[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload["user_id"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

# ✅ NEW PROFILE ROUTE (IMPORTANT)
@router.get("/profile")
def get_profile(user_id=Depends(get_current_user)):
    from main import users_collection, threads_collection

    user = users_collection.find_one({"_id": ObjectId(user_id)})

    if not user:
        return {"error": "User not found"}

    chat_count = threads_collection.count_documents({"user_id": user_id})

    return {
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "chats": chat_count,
        "joined": user.get("created_at")
    }


# ✅ UPDATE NAME
@router.put("/update-name")
def update_name(data: dict, user_id=Depends(get_current_user)):
    from main import users_collection

    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"name": data["name"]}}
    )
    return {"message": "Updated"}


# ✅ CHANGE PASSWORD
@router.put("/change-password")
def change_password(data: dict, user_id=Depends(get_current_user)):
    from main import users_collection

    hashed = bcrypt.hashpw(data["password"].encode(), bcrypt.gensalt())

    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"password": hashed.decode()}}
    )
    return {"message": "Password updated"}


# ✅ DELETE ACCOUNT
@router.delete("/delete-account")
def delete_account(user_id=Depends(get_current_user)):
    from main import users_collection, threads_collection

    users_collection.delete_one({"_id": ObjectId(user_id)})
    threads_collection.delete_many({"user_id": user_id})

    return {"message": "Account deleted"}