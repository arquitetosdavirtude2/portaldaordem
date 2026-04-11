from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    print("--- PESSOAS COLUMNS ---")
    try:
        # For MySQL
        result = conn.execute(text("DESCRIBE pessoas"))
        for row in result:
            print(row)
    except Exception as e:
        print(f"Error DESCRIBING pessoas: {e}")
        # For SQLite fallback
        try:
            result = conn.execute(text("PRAGMA table_info(pessoas)"))
            for row in result:
                print(row)
        except Exception as e2:
            print(f"Error PRAGMA table_info: {e2}")
