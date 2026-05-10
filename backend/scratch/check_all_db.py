from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
engine = create_engine(db_url)

with engine.connect() as conn:
    try:
        tables = conn.execute(text("SHOW TABLES")).fetchall()
        for table in tables:
            tname = table[0]
            print(f"--- Table: {tname} ---")
            cols = conn.execute(text(f"DESCRIBE {tname}")).fetchall()
            for col in cols:
                print(f"  {col[0]}")
    except Exception as e:
        print(f"Error: {e}")
