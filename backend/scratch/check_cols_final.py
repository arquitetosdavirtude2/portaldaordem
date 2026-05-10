from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
engine = create_engine(db_url)

with engine.connect() as conn:
    try:
        result = conn.execute(text("DESCRIBE transacoes")).fetchall()
        print("Columns in transacoes:")
        for row in result:
            print(f"- {row[0]}")
    except Exception as e:
        print(f"Error: {e}")
