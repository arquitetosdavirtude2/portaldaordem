from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
engine = create_engine(db_url)

with engine.connect() as conn:
    try:
        results = conn.execute(text("SHOW DATABASES")).fetchall()
        print("Databases:")
        for row in results:
            print(f"- {row[0]}")
    except Exception as e:
        print(f"Error: {e}")
