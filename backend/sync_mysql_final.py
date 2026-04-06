import pymysql
import os
from dotenv import load_dotenv

# 1. Load env
load_dotenv('backend/.env')

db_url = os.getenv('DATABASE_URL')
# mysql+pymysql://user:password@host/dbname
user = db_url.split('://')[1].split(':')[0]
password = db_url.split(':')[2].split('@')[0].replace('%40', '@')
host = db_url.split('@')[1].split('/')[0]
db_name = db_url.split('/')[-1].split('?')[0]

def final_mysql_sync():
    print(f"DEBUG: Final Sync to MySQL {db_name} as {user}...")
    try:
        conn = pymysql.connect(
            host=host,
            user=user,
            password=password,
            database=db_name,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )
        print("DEBUG: Connection successful.")
        
        with conn.cursor() as cursor:
            # 1. Insert the 2 transactions (Michel ID 6)
            # We already have Caixa 2 (Banco Pan) created by the user's SQL
            print("DEBUG: Inserting 2 transactions for Michel (ID 6)...")
            
            # Using INSERT IGNORE to avoid duplicates if he ran it already
            cursor.execute("""
                INSERT IGNORE INTO transacoes (id, caixa_id, pessoa_id, usuario_id, tipo, categoria, valor, data_vencimento, status, descricao) 
                VALUES (2, 2, 6, 1, 'entrada', 'mensalidade', 250.0, '2026-04-03', 'pago', 'Parcela 1/4 da Joia')
            """)
            cursor.execute("""
                INSERT IGNORE INTO transacoes (id, caixa_id, pessoa_id, usuario_id, tipo, categoria, valor, data_vencimento, status, descricao) 
                VALUES (3, 2, 6, 1, 'entrada', 'joia', 500.0, '2026-04-03', 'pago', 'Joia de Admissão')
            """)
            
            conn.commit()
            print("--- FINAL MYSQL SYNC COMPLETE ---")
            
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    final_mysql_sync()
