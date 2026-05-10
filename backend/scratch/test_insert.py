from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
engine = create_engine(db_url)

with engine.connect() as conn:
    try:
        conn.execute(text("INSERT INTO transacoes (tipo, categoria, valor, mes_referencia) VALUES ('entrada', 'teste', 0, '2024-05')"))
        conn.commit()
        print("Insert successful!")
        conn.execute(text("DELETE FROM transacoes WHERE categoria = 'teste'"))
        conn.commit()
    except Exception as e:
        print(f"Error: {e}")
