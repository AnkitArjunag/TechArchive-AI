from fastapi import APIRouter, HTTPException # type: ignore
from db import users_collection
from models.user import UserCreate, UserLogin
from utils.auth import hash_password, verify_password, create_token

router = APIRouter()

# SIGNUP
@router.post("/api/register")
def register(user: UserCreate):

    existing = users_collection.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    hashed = hash_password(user.password)

    user_id = users_collection.insert_one({
        "name": user.name,
        "email": user.email,
        "password": hashed
    }).inserted_id

    token = create_token({"user_id": str(user_id)})

    return {"token": token}


# LOGIN
@router.post("/api/login")
def login(user: UserLogin):

    db_user = users_collection.find_one({"email": user.email})

    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token({"user_id": str(db_user["_id"])})

    return {"token": token}