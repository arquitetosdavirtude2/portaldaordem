import sqlite3
import os

dbs = ["database.db", "portal.db", "banco.db"]

for db_path in dbs:
    if os.path.exists(db_path):
        print(f"\n--- Verificando {db_path} ---")
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='lojas'")
            if cursor.fetchone():
                print("Tabela 'lojas' ENCONTRADA!")
                cursor.execute("SELECT COUNT(*) FROM lojas")
                print(f"Número de lojas: {cursor.fetchone()[0]}")
            else:
                print("Tabela 'lojas' não encontrada.")
            conn.close()
        except Exception as e:
            print(f"Erro: {e}")
    else:
        print(f"\n{db_path} não existe.")
