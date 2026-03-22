import sqlite_utils
from pathlib import Path

db_path = Path("c:/Users/Michel/Documents/01 - Discreto/Softwares/portaldaordem/backend/database.db")

if db_path.exists():
    db = sqlite_utils.Database(db_path)
    
    # Add login and senha columns to personas table
    if "login" not in db["pessoas"].columns_dict:
        db["pessoas"].add_column("login", str)
        print("Added 'login' column to 'pessoas' table.")
    
    if "senha" not in db["pessoas"].columns_dict:
        db["pessoas"].add_column("senha", str)
        print("Added 'senha' column to 'pessoas' table.")
else:
    print(f"Database not found at {db_path}")
