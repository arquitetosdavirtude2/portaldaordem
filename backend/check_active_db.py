from database import engine, DATABASE_URL
from sqlalchemy import text
import os

print(f"DATABASE_URL de database.py: {DATABASE_URL}")
print(f"OS NAME: {os.name}")

try:
    with engine.connect() as conn:
        print("Conexão bem sucedida!")
        if "mysql" in DATABASE_URL:
            res = conn.execute(text("SHOW TABLES")).fetchall()
        else:
            res = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()
        
        print(f"--- Tabelas encontradas ---")
        for row in res:
            print(row[0])
            
        # Inspect 'caixas' table specifically
        try:
            if "mysql" in DATABASE_URL:
                columns = conn.execute(text("DESCRIBE caixas")).fetchall()
            else:
                columns = conn.execute(text("PRAGMA table_info(caixas)")).fetchall()
            print(f"--- Colunas de 'caixas' ---")
            for col in columns:
                print(col)
        except Exception as e:
            print(f"Erro ao descrever 'caixas': {e}")
            
except Exception as e:
    print(f"Erro ao conectar no banco: {e}")
