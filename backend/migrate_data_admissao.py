from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    print("--- ALTERING TABLES ---")
    try:
        conn.execute(text("ALTER TABLE pessoas ADD COLUMN data_admissao VARCHAR(20) DEFAULT NULL"))
        conn.commit()
        print("Success: data_admissao added to pessoas")
    except Exception as e:
        print(f"Error: {e}")
