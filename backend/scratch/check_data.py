from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
engine = create_engine(db_url)

with engine.connect() as conn:
    try:
        result = conn.execute(text("SELECT id, mes_referencia FROM transacoes LIMIT 1")).fetchone()
        print(f"Data: {result}")
    except Exception as e:
        print(f"Error: {e}")
