from pymongo import MongoClient # type: ignore

client = MongoClient("mongodb://localhost:27017")
db = client["techarchive"]

users_collection = db["users"]
threads_collection = db["threads"]