import chromadb

client = chromadb.PersistentClient(path="./techarchive_db")
collection = client.get_collection("defense_research")

print(collection.count())