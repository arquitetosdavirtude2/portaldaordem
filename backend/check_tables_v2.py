import sqlalchemy
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")

try:
    engine = create_engine(db_url)
    with engine.connect() as conn:
        res = conn.execute(text("SHOW TABLES LIKE 'caixas'")).fetchone()
        print(f"Caixas exists: {bool(res)}")
        res = conn.execute(text("SHOW TABLES LIKE 'transacoes'")).fetchone()
        print(f"Transacoes exists: {bool(res)}")
except Exception as e:
    print(f"Error checking tables: {e}")
