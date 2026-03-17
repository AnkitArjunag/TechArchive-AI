from fastapi import Header, HTTPException # type: ignore
from jose import jwt # type: ignore
from db import users_collection

SECRET_KEY = "secret"
ALGORITHM = "HS256"

def get_current_user(authorization: str = Header(None)):

    if not authorization:
        raise HTTPException(status_code=401, detail="Missing token")

    token = authorization.split(" ")[1]

    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    user_id = payload.get("user_id")

    user = users_collection.find_one({"_id": user_id})

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user