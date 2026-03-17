from passlib.context import CryptContext # type: ignore
from jose import jwt # type: ignore
from datetime import datetime, timedelta

SECRET_KEY = "secret"
ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password):
    return pwd_context.hash(password)

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def create_token(data: dict):
    to_encode = data.copy()
    to_encode["exp"] = datetime.utcnow() + timedelta(days=1)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)