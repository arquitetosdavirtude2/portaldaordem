import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "database.db")

def add_loja_id_to_pessoas():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if the column already exists
        cursor.execute("PRAGMA table_info(pessoas)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if "loja_id" not in columns:
            print("Adding 'loja_id' column to 'pessoas' table...")
            cursor.execute("ALTER TABLE pessoas ADD COLUMN loja_id INTEGER REFERENCES lojas(id)")
            conn.commit()
            print("Column 'loja_id' added successfully.")
        else:
            print("Column 'loja_id' already exists in 'pessoas' table.")
            
        conn.close()
    except Exception as e:
        print(f"Error updating database: {e}")

if __name__ == "__main__":
    add_loja_id_to_pessoas()
