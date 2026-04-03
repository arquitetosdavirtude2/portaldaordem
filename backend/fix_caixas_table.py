import os
import sqlite3
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./database.db")

def fix_sqlite(db_path):
    print(f"Fixing SQLite: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check saldo_atual
    cursor.execute("PRAGMA table_info(caixas)")
    cols = [row[1] for row in cursor.fetchall()]
    
    if 'saldo_atual' not in cols:
        print("Adicionando saldo_atual...")
        cursor.execute("ALTER TABLE caixas ADD COLUMN saldo_atual FLOAT DEFAULT 0.0")
    
    if 'loja_id' not in cols:
        print("Adicionando loja_id...")
        cursor.execute("ALTER TABLE caixas ADD COLUMN loja_id INTEGER")
        
    conn.commit()
    conn.close()

def fix_mysql(url):
    print(f"Fixing MySQL: {url}")
    engine = create_engine(url)
    with engine.connect() as conn:
        # Check if table exists
        try:
            conn.execute(text("DESCRIBE caixas"))
        except:
            print("Table caixas missing in MySQL. Creating...")
            conn.execute(text("""
                CREATE TABLE caixas (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    loja_id INT,
                    nome VARCHAR(100),
                    saldo_atual FLOAT DEFAULT 0.0
                )
            """))
            conn.commit()
            return
            
        # Add columns if missing
        res = conn.execute(text("SHOW COLUMNS FROM caixas LIKE 'saldo_atual'")).fetchone()
        if not res:
            conn.execute(text("ALTER TABLE caixas ADD COLUMN saldo_atual FLOAT DEFAULT 0.0"))
            
        res = conn.execute(text("SHOW COLUMNS FROM caixas LIKE 'loja_id'")).fetchone()
        if not res:
            conn.execute(text("ALTER TABLE caixas ADD COLUMN loja_id INTEGER"))
        conn.commit()

if __name__ == "__main__":
    if "mysql" in DATABASE_URL:
        try:
            fix_mysql(DATABASE_URL)
        except Exception as e:
            print(f"MySQL Error: {e}")
            
    # Always fix SQLite as fallback or local
    for db in ["database.db", "portal.db"]:
        if os.path.exists(db):
            fix_sqlite(db)
