import sqlite3
import os

db_path = 'treasury.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM caixas WHERE nome LIKE '%Banco Pan%'")
    conn.commit()
    print(f"Deleted {cursor.rowcount} rows from caixas.")
    conn.close()
else:
    print("treasury.db not found.")
