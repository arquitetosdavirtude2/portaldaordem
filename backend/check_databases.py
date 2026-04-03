import sqlite3
import os

dbs = ['database.db', 'portal.db', 'banco.db']

for db_path in dbs:
    if os.path.exists(db_path):
        print(f"--- Checking {db_path} ---")
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Check if 'lojas' table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='lojas'")
            if cursor.fetchone():
                cursor.execute("SELECT nome FROM lojas")
                print(f"Lojas found: {cursor.fetchall()}")
            else:
                print("Table 'lojas' not found.")
                
            # Check if 'pessoas' table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='pessoas'")
            if cursor.fetchone():
                cursor.execute("SELECT nome FROM pessoas")
                print(f"Pessoas found: {cursor.fetchall()}")
            else:
                print("Table 'pessoas' not found.")
            
            conn.close()
        except Exception as e:
            print(f"Error checking {db_path}: {e}")
    else:
        print(f"{db_path} does not exist.")
