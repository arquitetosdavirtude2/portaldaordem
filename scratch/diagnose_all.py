import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

def diagnose_all_people():
    try:
        conn = pymysql.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASS", ""),
            database=os.getenv("DB_NAME", "portal_ordem"),
            port=int(os.getenv("DB_PORT", 3306))
        )
        cursor = conn.cursor()
        
        print("--- LOJAS CADASTRADAS ---")
        cursor.execute("SELECT id, nome FROM lojas")
        for r in cursor.fetchall():
            print(f"ID: {r[0]} | Nome: {r[1]}")
            
        print("\n--- PESSOAS CADASTRADAS (TODAS) ---")
        cursor.execute("SELECT id, nome, status, loja_id, ativo, data_adormecimento FROM pessoas")
        rows = cursor.fetchall()
        print(f"Total de pessoas: {len(rows)}")
        for r in rows:
            print(f"ID: {r[0]} | Nome: {r[1]:<30} | Status: {r[2]:<15} | Loja: {r[3]} | Ativo: {r[4]} | Adorm.: {r[5]}")
            
        conn.close()
    except Exception as e:
        print(f"Erro: {e}")

if __name__ == "__main__":
    diagnose_all_people()
