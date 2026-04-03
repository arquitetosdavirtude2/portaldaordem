import sqlalchemy
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")

if not db_url:
    print("DATABASE_URL not found in .env")
    exit(1)

try:
    engine = create_engine(db_url)
    with engine.connect() as conn:
        print("--- MySQL Tables ---")
        try:
            res = conn.execute(text("SHOW TABLES"))
            for r in res:
                print(r[0])
        except Exception as e:
            print(f"Error listing tables: {e}")

        print("\n--- Lodges (Lojas) ---")
        try:
            res = conn.execute(text("SELECT id, nome FROM lojas"))
            for r in res:
                print(f"ID: {r[0]}, Nome: {r[1]}")
        except Exception as e:
            print(f"Error querying lojas: {e}")

        print("\n--- People (Pessoas) ---")
        try:
            res = conn.execute(text("SELECT id, nome FROM pessoas WHERE nome LIKE '%Michel%'"))
            for r in res:
                print(f"ID: {r[0]}, Nome: {r[1]}")
        except Exception as e:
            print(f"Error querying pessoas: {e}")

except Exception as e:
    print(f"Connection failed: {e}")
