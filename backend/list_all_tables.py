import sqlite3
import os

dbs = ["database.db", "portal.db", "banco.db"]

for db_path in dbs:
    if os.path.exists(db_path):
        print(f"--- Tabelas em {db_path} ---")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        for t in tables:
            print(t[0])
        conn.close()
    else:
        print(f"{db_path} não existe.")
