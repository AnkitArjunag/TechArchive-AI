from fastapi import APIRouter, Depends #    type: ignore
from bson import ObjectId #    type: ignore
import bcrypt #    type: ignore

router = APIRouter()


def get_current_user(request):
    from main import SECRET_KEY, ALGORITHM
    import jwt #    type: ignore

    auth = request.headers.get("Authorization")
    token = auth.split(" ")[1]
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

    return payload["user_id"]


@router.put("/update-name")
def update_name(data: dict, user_id=Depends(get_current_user)):
    from main import users_collection

    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"name": data["name"]}}
    )
    return {"message": "Updated"}


@router.put("/change-password")
def change_password(data: dict, user_id=Depends(get_current_user)):
    from main import users_collection

    hashed = bcrypt.hashpw(data["password"].encode(), bcrypt.gensalt())

    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"password": hashed.decode()}}
    )
    return {"message": "Password updated"}


@router.delete("/delete-account")
def delete_account(user_id=Depends(get_current_user)):
    from main import users_collection, threads_collection

    users_collection.delete_one({"_id": ObjectId(user_id)})
    threads_collection.delete_many({"user_id": user_id})

    return {"message": "Account deleted"}