import chromadb # type: ignore

# Connect to the existing database
client = chromadb.PersistentClient(path="./techarchive_db")
collection = client.get_collection(name="defense_research")

def ask_tech_archive(query):
    results = collection.query(
        query_texts=[query],
        n_results=2
    )
    
    print(f"\n🔍 Query: {query}")
    for i in range(len(results['documents'][0])):
        print(f"📄 Result {i+1} (Source: {results['metadatas'][0][i]['source']}):")
        print(f"Summary: {results['documents'][0][i]}")
        print(f"Hardware: {results['metadatas'][0][i]['hardware']}")
        print(f"Pages: {results['metadatas'][0][i]['pages']}\n")

# Test with a specific engineering parameter
if __name__ == "__main__":
    ask_tech_archive("What is the SMT temperature for the MoS2/VO2 heterojunction?")